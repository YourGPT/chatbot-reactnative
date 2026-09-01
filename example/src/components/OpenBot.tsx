import React from 'react';
import {Button, Text, View,TouchableOpacity} from 'react-native';
import {useYourGPT} from '../context/YourGPTProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OpenBot() {
  const {open} = useYourGPT();
  const insets = useSafeAreaInsets();

  return (
    <View style={{flex: 1,paddingTop:insets.top}}>
      <Text style={{fontSize: 20, fontWeight: 'bold', textAlign: 'center'}}>YourGPT React Native SDK</Text>
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <TouchableOpacity onPress={open} style={{backgroundColor: '#2B6FF3', padding: 12, borderRadius: 10}}>
          <Text style={{fontSize: 20,fontWeight: '500', textAlign: 'center', color: 'white'}}>Open Chatbot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
