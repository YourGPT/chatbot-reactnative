import React from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import {useYourGPT} from '@yourgpt/chatbot-reactnative';

export const FloatingChatButton = () => {
  const {open} = useYourGPT();

  return (
    <TouchableOpacity style={styles.floatingButton} onPress={open}>
      <Text style={styles.icon}>💬</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  icon: {
    fontSize: 28,
  },
});
