import React, { useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeInsets } from '../utils/safeArea';
import { YourGPTWidget } from './YourGPTWidget';
import { YourGPTSDK } from '../core/YourGPTSDK';
import { useSDKState } from '../hooks/useSDKState';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.92;
const SWIPE_CLOSE_THRESHOLD = 80;

interface YourGPTBottomSheetProps {
  visible: boolean;
  url: string;
  onClose: () => void;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: string, retry: () => void) => React.ReactNode;
}

export function YourGPTBottomSheet({
  visible,
  url,
  onClose,
  renderLoading,
  renderError,
}: YourGPTBottomSheetProps) {
  const insets = useSafeInsets();
  const sdkState = useSDKState();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [slideAnim]);

  const animateOut = useCallback(
    (callback?: () => void) => {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        dragY.setValue(0);
        callback?.();
      });
    },
    [slideAnim, dragY],
  );

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SHEET_HEIGHT);
      dragY.setValue(0);
      animateIn();
    }
  }, [visible, animateIn, slideAnim, dragY]);

  const handleClose = useCallback(() => {
    animateOut(() => onClose());
  }, [animateOut, onClose]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- swipe-to-close gesture, not yet attached to the sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 5,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          dragY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_CLOSE_THRESHOLD) {
          YourGPTSDK.hide();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const combinedTranslateY = Animated.add(slideAnim, dragY);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />

      {/* Bottom sheet.
          Height must be a percentage, not SHEET_HEIGHT pixels: with Android's
          adjustResize the modal container shrinks when the keyboard opens, and
          a fixed full-screen-based height overflows the top (clipping the
          widget header). A percentage tracks the visible space instead.
          SHEET_HEIGHT is still used for the slide animation distance. */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: '92%',
            paddingBottom: insets.bottom,
            transform: [{ translateY: combinedTranslateY }],
          },
        ]}
      >
        {/* Widget content */}
        <View style={styles.content}>
          {sdkState.error && renderError ? (
            renderError(sdkState.error, () => YourGPTSDK.show())
          ) : sdkState.isLoading && renderLoading ? (
            <View style={styles.loadingOverlay}>
              {renderLoading()}
              <YourGPTWidget url={url} />
            </View>
          ) : (
            <YourGPTWidget url={url} />
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handleContainer: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  content: {
    flex: 1,
  },
  loadingOverlay: {
    flex: 1,
  },
});
