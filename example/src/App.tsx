/**
 * Demo Apps with YourGPT Integration
 * Showcases Social Media and Fitness app examples
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { JSX } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TouchableOpacity, View } from 'react-native';
import { Users, Settings } from 'lucide-react-native';
import { PostProvider } from './context/PostProvider';
import { YourGPTWithDataProvider } from './context/YourGPTWithDataProvider';
import { FeedScreen } from './screens/FeedScreen';
import { CreatePostScreen } from './screens/CreatePostScreen';
import { FitnessScreen } from './screens/FitnessScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App(): JSX.Element {
  return (
    <SafeAreaProvider>
      <PostProvider>
        <YourGPTWithDataProvider
          widgetId="yourgpt-widget-uid"
          onClose={() => {
            console.log('Chatbot closed');
          }}
        >
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Feed"
              screenOptions={({ navigation, route }) => ({
                headerStyle: {
                  backgroundColor: '#2563eb',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                headerRight: () => (
                  <View style={{ flexDirection: 'row', marginRight: 8 }}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Feed')}
                      style={{
                        padding: 8,
                        marginRight: 8,
                        opacity: route.name === 'Feed' ? 1 : 0.6,
                      }}
                    >
                      <Users size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Fitness')}
                      style={{
                        padding: 8,
                        opacity: route.name === 'Fitness' ? 1 : 0.6,
                      }}
                    >
                      <Settings size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ),
              })}
            >
              <Stack.Screen
                name="Feed"
                component={FeedScreen}
                options={{
                  title: 'Social Feed',
                }}
              />
              <Stack.Screen
                name="CreatePost"
                component={CreatePostScreen}
                options={{
                  title: 'Create Post',
                }}
              />
              <Stack.Screen
                name="Fitness"
                component={FitnessScreen}
                options={{
                  title: 'Fitness Tracker',
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </YourGPTWithDataProvider>
      </PostProvider>
    </SafeAreaProvider>
  );
}
