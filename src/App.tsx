/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {View} from 'react-native';
import OpenBot from './components/OpenBot';
import YourGPTProvider from './context/YourGPTProvider';

export default function App(): JSX.Element {
  return (
    <View style={{flex: 1}}>
      <YourGPTProvider widgetId="YOUR_WIDGET_ID">
        <View>
          <OpenBot />
        </View>
      </YourGPTProvider>
    </View>
  );
}
