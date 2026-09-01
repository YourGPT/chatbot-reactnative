import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types';
import {usePosts} from '../context/PostProvider';

type CreatePostScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CreatePost'
>;

interface CreatePostScreenProps {
  navigation: CreatePostScreenNavigationProp;
}

const MAX_CHARACTERS = 280;

export const CreatePostScreen = ({navigation}: CreatePostScreenProps) => {
  const [content, setContent] = useState('');
  const {createPost} = usePosts();

  const handlePost = async () => {
    if (content.trim().length === 0) {
      Alert.alert('Empty Post', 'Please write something before posting.');
      return;
    }

    try {
      await createPost(content.trim());
      Alert.alert('Success', 'Your post has been published!', [
        {
          text: 'OK',
          onPress: () => {
            setContent('');
            navigation.navigate('Feed');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const remainingChars = MAX_CHARACTERS - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.label}>What's on your mind?</Text>
          <TextInput
            style={styles.input}
            placeholder="Share your thoughts, achievements, or ideas..."
            placeholderTextColor="#999"
            multiline
            value={content}
            onChangeText={setContent}
            maxLength={MAX_CHARACTERS + 50}
            textAlignVertical="top"
          />
          <View style={styles.footer}>
            <Text
              style={[
                styles.charCount,
                isOverLimit && styles.charCountError,
              ]}>
              {remainingChars} characters remaining
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.postButton, isOverLimit && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={isOverLimit}>
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  footer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: 14,
    color: '#666',
  },
  charCountError: {
    color: '#ef4444',
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  postButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  postButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});
