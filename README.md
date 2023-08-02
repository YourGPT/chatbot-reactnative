# yourgpt-chatbot-reactnative

Integrate YourGPT Chatbot seamlessly into your react-native application.

## Installation

### 1. Add yourgpt-chatbot-reactnative to your dependencies

```
$ npm i yourgpt-chatbot-reactnative
```

### 2. Add react-native-webview to your dependencies

Refer <a href="https://github.com/react-native-webview/react-native-webview/blob/master/docs/Getting-Started.md" target="_blank">react-native-webview docs</a>

### 3. Link native dependencies

##### iOS & macOS:

If using CocoaPods, in the ios/ or macos/ directory run:

```
$ pod install
```

##### Android:

No aditional configuration required.

## Usage

You can get your project_id and widget_id from <a href="https://yourgpt.ai/chatbot" target="_blank">https://yourgpt.ai/chatbot</a>

```
// In app.tsx
import React from 'react';
import {SafeAreaView, View} from 'react-native';
import YourGPTProvider from 'yourgpt-chatbot-reactnative';

function App(): JSX.Element {
  return (
    <SafeAreaView style={{flex: 1}}>
      <YourGPTProvider projectId="Your_Project_Id" widgetId="Your_Widget_Id">
          // SOME CODE HERE
      </YourGPTProvider>
    </SafeAreaView>
  );
}

export default App;

```

```
// In components/OpenBot.tsx
import React from 'react';
import {Button} from 'react-native';
import {useYourGPT} from 'yourgpt-chatbot-reactnative';

export default function OpenBot() {
  const {open} = useYourGPT();

  return <Button onPress={open} title="Open Bot" />;
}

```

## API

#### Props

Props which will be passed in `<YourGPTProvider>`

| Prop        | Type      | Required | Description                                                        |
| ----------- | --------- | -------- | ------------------------------------------------------------------ |
| projectId   | String    | Yes      | Project id of yourGPT chatbot                                      |
| widgetId    | String    | Yes      | Widget id of yourGPT chatbot                                       |
| headerColor | String    | No       | Custom header color, by default transparent                        |
| children    | ReactNode | Yes      | React native elements which will be wrapped inside YourGPTProvider |

#### Methods

All the methods which you can get from `useYourGPT` hook.

| Method | Parameter | Description                          |
| ------ | --------- | ------------------------------------ |
| open   | void      | Open chatbot widget inside a webview |
| close  | void      | Close chatbot widget                 |
