import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useYourGPTContext} from './YourGPTProvider';

interface FloatingButtonProps {
  icon?: string;
  color?: string;
  size?: number;
  bottom?: number;
  right?: number;
}

export function FloatingButton({
  icon = '💬',
  color = '#2563eb',
  size = 60,
  bottom = 24,
  right = 24,
}: FloatingButtonProps) {
  const {open} = useYourGPTContext();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          bottom,
          right,
        },
      ]}
      onPress={open}
      activeOpacity={0.8}>
      <Text style={[styles.icon, {fontSize: size * 0.45}]}>{icon}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  icon: {
    lineHeight: undefined,
  },
});
