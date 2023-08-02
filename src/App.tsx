/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {SafeAreaView, View} from 'react-native';
import OpenBot from './components/OpenBot';
import YourGPTProvider from './context/YourGPTProvider';

export default function App(): JSX.Element {
  return (
    <SafeAreaView style={{flex: 1}}>
      <YourGPTProvider
        projectId="6ab3600e-7fcd-4261-9a15-abf9beabf455"
        widgetId="600c90f7-322c-4c28-851a-f5e08dddb33f">
        <View>
          <OpenBot />
        </View>
      </YourGPTProvider>
    </SafeAreaView>
  );
}
