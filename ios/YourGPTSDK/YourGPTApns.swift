import UIKit
import UserNotifications
import React

/// Native APNs module for the YourGPT React Native SDK.
///
/// Handles APNs token acquisition, foreground notification display,
/// and notification tap events — all without manual AppDelegate changes.
///
/// Usage in AppDelegate.swift:
/// ```swift
/// import yourgpt_react_native_sdk
///
/// func application(_ application: UIApplication,
///                   didFinishLaunchingWithOptions ...) -> Bool {
///     YourGPTApns.configure(application)
///     // ... rest of your setup
///     return true
/// }
/// ```
@objc(YourGPTApns)
public class YourGPTApns: RCTEventEmitter, UNUserNotificationCenterDelegate {

    // MARK: - Singleton & Bridge Instance

    /// The singleton used as UNUserNotificationCenter delegate and APNs handler.
    /// This is NOT the same instance as the one React Native creates for the bridge.
    @objc public static let shared = YourGPTApns()

    /// The bridge instance created by React Native. Only this instance can send
    /// events to JS because it has a valid bridge reference.
    private static weak var bridgeInstance: YourGPTApns?

    // MARK: - Properties

    private var cachedToken: String?
    private var hasListeners = false
    private var pendingEvents: [(String, Any?)] = []
    private static let tokenKey = "yourgpt_apns_token"
    private static var isConfigured = false

    // MARK: - RCTEventEmitter

    override init() {
        super.init()
        // Restore cached token from UserDefaults
        cachedToken = UserDefaults.standard.string(forKey: Self.tokenKey)
    }

    @objc public override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc public override func supportedEvents() -> [String] {
        return [
            "YourGPTApns:onTokenReceived",
            "YourGPTApns:onTokenError",
            "YourGPTApns:onNotificationReceived",
            "YourGPTApns:onNotificationTapped",
            "YourGPTApns:onPermissionGranted",
            "YourGPTApns:onPermissionDenied",
        ]
    }

    override public func startObserving() {
        hasListeners = true

        // Register ourselves as the bridge instance — React Native calls
        // startObserving() on the instance IT created (which has a bridge).
        Self.bridgeInstance = self

        // Flush any events that accumulated on the shared singleton before
        // the bridge instance was ready.
        let queued = Self.shared.pendingEvents
        Self.shared.pendingEvents.removeAll()
        for (name, body) in queued {
            sendEvent(withName: name, body: body)
        }
    }

    override public func stopObserving() {
        hasListeners = false
    }

    /// Route events through the bridge instance (which has a valid RN bridge).
    /// If the bridge isn't ready yet, queue on the shared singleton for later flush.
    private func emit(_ name: String, body: Any? = nil) {
        if let bridge = Self.bridgeInstance, bridge.hasListeners {
            bridge.sendEvent(withName: name, body: body)
        } else {
            // Queue on shared — will be flushed in startObserving()
            Self.shared.pendingEvents.append((name, body))
        }
    }

    // MARK: - Public API: configure()

    /// One-line setup. Call this in `application(_:didFinishLaunchingWithOptions:)`.
    ///
    /// - Sets the UNUserNotificationCenter delegate for foreground display & tap handling.
    /// - Swizzles the AppDelegate to intercept APNs token and notification callbacks.
    @objc public static func configure(_ application: UIApplication) {
        guard !isConfigured else { return }
        isConfigured = true

        // Defer delegate assignment to the next run loop iteration so that
        // other plugins (Firebase, Notifee) that also set the delegate during
        // didFinishLaunchingWithOptions finish first. We set last → we win.
        // This matches the Flutter SDK's approach.
        DispatchQueue.main.async {
            UNUserNotificationCenter.current().delegate = shared
        }

        // Swizzle AppDelegate methods to intercept APNs callbacks
        swizzleAppDelegate()
    }

    // MARK: - Exported methods to JS

    @objc func requestPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                                  rejecter reject: @escaping RCTPromiseRejectBlock) {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { [weak self] granted, error in
            DispatchQueue.main.async {
                if let error = error {
                    reject("PERMISSION_ERROR", error.localizedDescription, error)
                    return
                }
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                    self?.emit("YourGPTApns:onPermissionGranted")
                } else {
                    self?.emit("YourGPTApns:onPermissionDenied")
                }
                resolve(granted)
            }
        }
    }

    @objc func getToken(_ resolve: RCTPromiseResolveBlock,
                         rejecter reject: RCTPromiseRejectBlock) {
        resolve(cachedToken ?? Self.shared.cachedToken)
    }

    @objc func isPermissionGranted(_ resolve: @escaping RCTPromiseResolveBlock,
                                     rejecter reject: @escaping RCTPromiseRejectBlock) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                resolve(settings.authorizationStatus == .authorized)
            }
        }
    }

    @objc func removeAllDeliveredNotifications() {
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }

    @objc func removeDeliveredNotification(_ identifier: String) {
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [identifier])
    }

    @objc func setBadgeCount(_ count: NSNumber) {
        DispatchQueue.main.async {
            UIApplication.shared.applicationIconBadgeNumber = count.intValue
        }
    }

    // MARK: - APNs token callbacks (called via swizzling)

    func didRegisterForRemoteNotifications(deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        cachedToken = token

        // Persist
        UserDefaults.standard.set(token, forKey: Self.tokenKey)

        // Send to JS
        emit("YourGPTApns:onTokenReceived", body: token)
    }

    func didFailToRegisterForRemoteNotifications(error: Error) {
        emit("YourGPTApns:onTokenError", body: error.localizedDescription)
    }

    func didReceiveRemoteNotification(userInfo: [AnyHashable: Any]) {
        let data = serializeUserInfo(userInfo)
        emit("YourGPTApns:onNotificationReceived", body: data)
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// Show notifications in foreground (banner + sound + badge).
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        let data = serializeUserInfo(userInfo)

        emit("YourGPTApns:onNotificationReceived", body: data)

        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    /// Notification tap handler — notify JS so the SDK can navigate to the relevant chat.
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let data = serializeUserInfo(userInfo)

        emit("YourGPTApns:onNotificationTapped", body: data)
        completionHandler()
    }

    // MARK: - Swizzling

    // Store original IMPs so our replacements can call through to them
    private static var originalDidRegisterIMP: IMP?
    private static var originalDidFailRegisterIMP: IMP?
    private static var originalDidReceiveRemoteIMP: IMP?

    private static func swizzleAppDelegate() {
        guard let appDelegate = UIApplication.shared.delegate,
              let cls = object_getClass(appDelegate) else {
            return
        }

        swizzleDidRegister(cls: cls)
        swizzleDidFailRegister(cls: cls)
        swizzleDidReceiveRemote(cls: cls)
    }

    private static func swizzleDidRegister(cls: AnyClass) {
        let sel = #selector(UIApplicationDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:))

        // Save original IMP if it exists
        if let original = class_getInstanceMethod(cls, sel) {
            originalDidRegisterIMP = method_getImplementation(original)
        }

        let block: @convention(block) (AnyObject, UIApplication, Data) -> Void = { _, application, deviceToken in
            YourGPTApns.shared.didRegisterForRemoteNotifications(deviceToken: deviceToken)
            // Call through to the original implementation if it existed
            if let orig = originalDidRegisterIMP {
                typealias Fn = @convention(c) (AnyObject, Selector, UIApplication, Data) -> Void
                let fn = unsafeBitCast(orig, to: Fn.self)
                fn(UIApplication.shared.delegate!, sel, application, deviceToken)
            }
        }

        let imp = imp_implementationWithBlock(block as Any)
        let types = "v@:@@" // void, self, _cmd, UIApplication, Data

        if let original = class_getInstanceMethod(cls, sel) {
            method_setImplementation(original, imp)
        } else {
            class_addMethod(cls, sel, imp, types)
        }
    }

    private static func swizzleDidFailRegister(cls: AnyClass) {
        let sel = #selector(UIApplicationDelegate.application(_:didFailToRegisterForRemoteNotificationsWithError:))

        if let original = class_getInstanceMethod(cls, sel) {
            originalDidFailRegisterIMP = method_getImplementation(original)
        }

        let block: @convention(block) (AnyObject, UIApplication, Error) -> Void = { _, application, error in
            YourGPTApns.shared.didFailToRegisterForRemoteNotifications(error: error)
            if let orig = originalDidFailRegisterIMP {
                typealias Fn = @convention(c) (AnyObject, Selector, UIApplication, Error) -> Void
                let fn = unsafeBitCast(orig, to: Fn.self)
                fn(UIApplication.shared.delegate!, sel, application, error)
            }
        }

        let imp = imp_implementationWithBlock(block as Any)
        let types = "v@:@@"

        if let original = class_getInstanceMethod(cls, sel) {
            method_setImplementation(original, imp)
        } else {
            class_addMethod(cls, sel, imp, types)
        }
    }

    private static func swizzleDidReceiveRemote(cls: AnyClass) {
        let sel = #selector(UIApplicationDelegate.application(_:didReceiveRemoteNotification:fetchCompletionHandler:))

        if let original = class_getInstanceMethod(cls, sel) {
            originalDidReceiveRemoteIMP = method_getImplementation(original)
        }

        let block: @convention(block) (AnyObject, UIApplication, [AnyHashable: Any], @escaping (UIBackgroundFetchResult) -> Void) -> Void = { _, application, userInfo, completionHandler in
            YourGPTApns.shared.didReceiveRemoteNotification(userInfo: userInfo)
            if let orig = originalDidReceiveRemoteIMP {
                typealias Fn = @convention(c) (AnyObject, Selector, UIApplication, [AnyHashable: Any], @escaping (UIBackgroundFetchResult) -> Void) -> Void
                let fn = unsafeBitCast(orig, to: Fn.self)
                fn(UIApplication.shared.delegate!, sel, application, userInfo, completionHandler)
            } else {
                completionHandler(.noData)
            }
        }

        let imp = imp_implementationWithBlock(block as Any)
        let types = "v@:@@?"

        if let original = class_getInstanceMethod(cls, sel) {
            method_setImplementation(original, imp)
        } else {
            class_addMethod(cls, sel, imp, types)
        }
    }

    // MARK: - Helpers

    private func serializeUserInfo(_ userInfo: [AnyHashable: Any]) -> [String: Any] {
        var result = [String: Any]()
        for (key, value) in userInfo {
            if let stringKey = key as? String {
                result[stringKey] = value
            }
        }
        return result
    }
}
