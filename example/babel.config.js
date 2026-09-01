module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@yourgpt/chatbot-reactnative': '../src/sdk',
        },
      },
    ],
  ],
};
