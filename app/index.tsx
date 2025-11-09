import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
const BASE_URL = "http://192.168.71.213:5000";
const SplashScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [userName, setName] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Check AsyncStorage for stored name on component mount
  useEffect(() => {
    const checkName = async () => {
      try {
        const storedName = await AsyncStorage.getItem('user_name');
        if (storedName) {
          // Navigate directly if name exists
          router.replace({ pathname: '/home', params: { userName: storedName } });
        } else {
          // Run fade-in animation if no name is found
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1500, // Smooth fade-in duration
            useNativeDriver: true,
          }).start();
        }
      } catch (error) {
        console.error('Error reading name from AsyncStorage', error);
        // Fallback to showing splash screen if AsyncStorage fails
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }).start();
      }
    };
    checkName();
  }, [fadeAnim]); // Dependency array ensures effect runs when fadeAnim changes

  // Handler for "Get Started" button press
  const handleGetStarted = () => {
    setModalVisible(true); // Show the name input modal
  };

  // Handler for "Continue" button in the modal
  const handleContinue = async () => {
    if (!userName.trim()) return; // Prevent continuation if name is empty or just whitespace
    setModalVisible(false); // Hide the modal

    try {
      // Save name locally using AsyncStorage
      await AsyncStorage.setItem('user_name', userName);

      // Send POST request to store name in the backend database
      // IMPORTANT: Replace 'http://192.168.149.213:5000' with your actual backend API URL.
      // Consider using environment variables for this in a real project.
      await fetch(`${BASE_URL}/api/riders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userName }),
      });
    } catch (error) {
      console.error('Error saving name or sending to backend:', error);
      // You might want to add user feedback here, e.g., a toast message
    }

    // Navigate to the home screen after a short delay for smooth transition
    setTimeout(() => {
      router.replace({ pathname: '/home', params: { userName } });
    }, 300);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* App Name */}
      <Text style={styles.appName}>RevIt</Text>
      <Text style={styles.tagline}>Ride Smart. Ride Together.</Text>

      {/* Get Started Button */}
      <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
        <Text style={styles.getStartedButtonText}>Get Started</Text>
      </TouchableOpacity>

      {/* Features Section */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          {/* Removed symbol, just text */}
          <Text style={styles.featureText}>Real-Time Tracking</Text>
        </View>
        <View style={styles.featureItem}>
          {/* Removed symbol, just text */}
          <Text style={styles.featureText}>Group Coordination</Text>
        </View>
        <View style={styles.featureItem}>
          {/* Removed symbol, just text */}
          <Text style={styles.featureText}>Safety Alerts</Text>
        </View>
      </View>

      {/* Name Input Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade" // Smooth fade animation for modal
        transparent={true}
        onRequestClose={() => setModalVisible(false)} // Allow closing with back button on Android
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Name</Text>
            <TextInput
              placeholder="Enter your name"
              value={userName}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#888" // Placeholder text color
              autoCapitalize="words" // Capitalize first letter of each word
              returnKeyType="done" // "Done" button on keyboard
              onSubmitEditing={handleContinue} // Submit on keyboard "Done"
            />
            <TouchableOpacity
              style={[styles.modalButton, !userName.trim() && styles.modalButtonDisabled]}
              onPress={handleContinue}
              disabled={!userName.trim()} // Disable button if input is empty
            >
              <Text style={styles.modalButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // White background
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20, // Horizontal padding for content
  },
  appName: {
    fontFamily: 'Poppins', // Ensure Poppins is loaded
    fontSize: 40, // Smaller app name
    fontWeight: '900', // Still extra bold for impact
    color: '#000', // Black text
    marginBottom: 5,
    letterSpacing: 1.5, // Slightly reduced letter spacing
    // Removed textShadow as it's not needed on a white background with black text
  },
  tagline: {
    fontFamily: 'Poppins',
    fontSize: 20, // Smaller tagline
    fontWeight: '600',
    color: '#333', // Dark grey for good contrast on white
    textAlign: 'center',
    marginBottom: 60, // Adjusted space before the button
  },
  getStartedButton: {
    backgroundColor: '#000', // Black button background
    paddingVertical: 15, // Adjusted vertical padding
    paddingHorizontal: 40, // Adjusted horizontal padding
    borderRadius: 8, // Slightly less rounded corners
    // Stronger shadow for pop effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    marginBottom: 60, // Adjusted space after the button
  },
  getStartedButtonText: {
    fontFamily: 'Poppins',
    fontSize: 18, // Smaller button text
    fontWeight: '700',
    color: '#fff', // White text for black button
  },
  featuresContainer: {
    flexDirection: 'row', // Arrange features in a row
    justifyContent: 'space-around', // Distribute space evenly
    width: '100%', // Take full width
    paddingHorizontal: 10, // Inner padding for features
  },
  featureItem: {
    alignItems: 'center',
    width: '30%', // Allocate width for 3 items per row
    paddingVertical: 10, // Add some vertical padding for spacing
  },
  // Removed featureIconPlaceholder style as symbols are no longer used
  featureText: {
    fontFamily: 'Poppins',
    fontSize: 15, // Smaller feature text
    fontWeight: '500',
    color: '#333', // Dark grey text for features
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Slightly lighter overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff', // White modal background
    width: '85%', // Adjusted modal width
    padding: 25, // Adjusted padding
    borderRadius: 12, // Adjusted border radius
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  modalTitle: {
    fontFamily: 'Poppins',
    fontSize: 18, // Adjusted title size
    fontWeight: '600',
    marginBottom: 20,
    color: '#000',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'black', // Lighter grey border
    borderRadius: 6, // Adjusted border radius
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    fontFamily: 'Poppins',
    fontSize: 16, // Adjusted input text size
    color: '#000',
    backgroundColor: 'white', // Very light grey background for input field
  },
  modalButton: {
    backgroundColor: '#000', // Black button
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  modalButtonDisabled: {
    backgroundColor: '#666', // Darker grey for disabled state
    opacity: 0.7,
  },
  modalButtonText: {
    fontFamily: 'Poppins',
    fontSize: 16, // Adjusted button text size
    fontWeight: '600',
    color: '#fff', // White text
  },
});

export default SplashScreen;