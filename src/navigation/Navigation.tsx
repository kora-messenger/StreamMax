import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import NewPasswordScreen from '../screens/NewPasswordScreen';
import EnterCodeScreen from '../screens/EnterCodeScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import DramasScreen from '../screens/DramasScreen';
import DramaPlayerScreen from '../screens/DramaPlayerScreen';
import MovieViewScreen from '../screens/MovieViewScreen';
import MeScreen from '../screens/MeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import InAppBrowserScreen from '../screens/InAppBrowserScreen';
import { colors } from '../theme/tokens';

const Stack = createNativeStackNavigator();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary },
};

export default function Navigation() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="NewPassword" component={NewPasswordScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="EnterCode" component={EnterCodeScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Dramas" component={DramasScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="DramaPlayer" component={DramaPlayerScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="MovieView" component={MovieViewScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Me" component={MeScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Browser" component={InAppBrowserScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
