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
        projectId={'YOUR_PROJECT_ID'}
        widgetId={'YOUR_WIDGET_ID'}>
        <View>
          <OpenBot />
        </View>
      </YourGPTProvider>
    </SafeAreaView>
  );
}
