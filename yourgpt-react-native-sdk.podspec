require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name             = 'yourgpt-react-native-sdk'
  s.version          = package['version']
  s.summary          = 'YourGPT React Native SDK — native APNs push notification support for iOS.'
  s.description      = 'Provides native APNs token acquisition, foreground notification display, and tap handling for the YourGPT React Native SDK.'
  s.homepage         = 'https://yourgpt.ai'
  s.license          = { :type => 'MIT' }
  s.author           = { 'YourGPT' => 'support@yourgpt.ai' }
  s.source           = { :git => 'https://github.com/YourGPT/chatbot-reactnative.git', :tag => s.version }
  s.source_files     = 'ios/YourGPTSDK/**/*.{swift,m}'
  s.dependency       'React-Core'
  s.platform         = :ios, '13.0'
  s.swift_version    = '5.0'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
