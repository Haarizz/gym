import React from "react";
import { StatusBar } from "expo-status-bar";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MemberHub } from "./src/screens/MemberHub";
import { BookSession } from "./src/screens/BookSession";
import { JoinClass } from "./src/screens/JoinClass";
import { AddChallenge } from "./src/screens/AddChallenge";
import { MembershipRenewal } from "./src/screens/MembershipRenewal";
import { MyStats } from "./src/screens/MyStats";
import { Account } from "./src/screens/Account";
import { Notifications } from "./src/screens/Notifications";
import { Settings } from "./src/screens/Settings";
import { CommunityFeed } from "./src/screens/CommunityFeed";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import { SettingsProvider, useSettings } from "./src/context/SettingsContext";
import type { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      initialRouteName="MemberHub"
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700" },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="MemberHub" component={MemberHub} options={{ headerShown: false }} />
      <Stack.Screen name="BookSession" component={BookSession} options={{ title: "Book Session" }} />
      <Stack.Screen name="JoinClass" component={JoinClass} options={{ title: "Join Class" }} />
      <Stack.Screen name="AddChallenge" component={AddChallenge} options={{ title: "Add Challenge" }} />
      <Stack.Screen name="MembershipRenewal" component={MembershipRenewal} options={{ title: "Membership" }} />
      <Stack.Screen name="MyStats" component={MyStats} options={{ title: "My Stats" }} />
      <Stack.Screen name="Account" component={Account} options={{ title: "Account" }} />
      <Stack.Screen name="Notifications" component={Notifications} options={{ title: "Notifications" }} />
      <Stack.Screen name="Settings" component={Settings} options={{ title: "Settings" }} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { settings, isLoaded, colors } = useSettings();

  if (!isLoaded) {
    return null;
  }

  const navTheme = settings.darkMode
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.card,
          text: colors.text,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.card,
          text: colors.text,
        },
      };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style={settings.darkMode ? "light" : "dark"} />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: route.name === "Community",
            tabBarActiveTintColor: "#111827",
            tabBarInactiveTintColor: "#94A3B8",
            tabBarStyle: {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
            tabBarIcon: ({ color, size }) => {
              if (route.name === "Home") {
                return <Ionicons name="home" size={size} color={color} />;
              }
              return <Ionicons name="chatbubbles" size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeStack} options={{ title: "Home" }} />
          <Tab.Screen name="Community" component={CommunityFeed} options={{ title: "Community" }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <NotificationsProvider>
        <AppContent />
      </NotificationsProvider>
    </SettingsProvider>
  );
}
