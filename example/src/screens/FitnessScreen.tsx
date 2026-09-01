import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Activity, Flame, TrendingUp, CheckCircle} from 'lucide-react-native';
import {RootStackParamList, Workout, FitnessStats} from '../types';
import {FloatingChatButton} from '../components/FloatingChatButton';

type FitnessScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Fitness'
>;

interface FitnessScreenProps {
  navigation: FitnessScreenNavigationProp;
}

const mockWorkouts: Workout[] = [
  {
    id: 1,
    name: 'Morning Run',
    duration: 30,
    calories: 250,
    type: 'Cardio',
    date: 'Today',
    completed: true,
  },
  {
    id: 2,
    name: 'Upper Body Strength',
    duration: 45,
    calories: 180,
    type: 'Strength',
    date: 'Today',
    completed: false,
  },
  {
    id: 3,
    name: 'Yoga Flow',
    duration: 20,
    calories: 80,
    type: 'Flexibility',
    date: 'Yesterday',
    completed: true,
  },
  {
    id: 4,
    name: 'HIIT Training',
    duration: 25,
    calories: 300,
    type: 'Cardio',
    date: 'Yesterday',
    completed: true,
  },
  {
    id: 5,
    name: 'Core Workout',
    duration: 15,
    calories: 100,
    type: 'Strength',
    date: '2 days ago',
    completed: true,
  },
];

const stats: FitnessStats = {
  totalWorkouts: 12,
  totalCalories: 2450,
  weeklyGoal: 5,
  weeklyProgress: 3,
};

export const FitnessScreen = ({navigation}: FitnessScreenProps) => {
  const [workouts, setWorkouts] = useState<Workout[]>(mockWorkouts);

  const toggleWorkoutComplete = (id: number) => {
    setWorkouts(
      workouts.map(workout =>
        workout.id === id
          ? {...workout, completed: !workout.completed}
          : workout,
      ),
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Cardio':
        return '#ef4444';
      case 'Strength':
        return '#2563eb';
      case 'Flexibility':
        return '#10b981';
      default:
        return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Activity size={24} color="#2563eb" />
            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>

          <View style={styles.statCard}>
            <Flame size={24} color="#ef4444" />
            <Text style={styles.statValue}>{stats.totalCalories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={24} color="#10b981" />
            <Text style={styles.statValue}>
              {stats.weeklyProgress}/{stats.weeklyGoal}
            </Text>
            <Text style={styles.statLabel}>Weekly Goal</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>Weekly Progress</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(stats.weeklyProgress / stats.weeklyGoal) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {stats.weeklyProgress} of {stats.weeklyGoal} workouts completed
          </Text>
        </View>

        {/* Workouts List */}
        <View style={styles.workoutsSection}>
          <Text style={styles.sectionTitle}>Your Workouts</Text>

          {workouts.map(workout => (
            <View key={workout.id} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <Text style={styles.workoutDate}>{workout.date}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleWorkoutComplete(workout.id)}>
                  <CheckCircle
                    size={28}
                    color={workout.completed ? '#10b981' : '#cbd5e1'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.workoutDetails}>
                <View
                  style={[
                    styles.typeBadge,
                    {backgroundColor: getTypeColor(workout.type) + '20'},
                  ]}>
                  <Text
                    style={[
                      styles.typeText,
                      {color: getTypeColor(workout.type)},
                    ]}>
                    {workout.type}
                  </Text>
                </View>

                <View style={styles.workoutMeta}>
                  <Text style={styles.metaText}>{workout.duration} min</Text>
                  <Text style={styles.metaDivider}>•</Text>
                  <Text style={styles.metaText}>{workout.calories} cal</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Start New Workout</Text>
        </TouchableOpacity>
      </ScrollView>

      <FloatingChatButton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  progressSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  workoutsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  workoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 14,
    color: '#666',
  },
  workoutDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  metaDivider: {
    fontSize: 14,
    color: '#cbd5e1',
    marginHorizontal: 8,
  },
  ctaButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
