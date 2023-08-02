import React from 'react';
import {Button, View} from 'react-native';
import {useYourGPT} from '../context/YourGPTProvider';

export default function OpenBot() {
  const {open} = useYourGPT();

  return (
    <View>
      <Button title="open bot" onPress={open} />
    </View>
  );
}
