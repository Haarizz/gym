import React from "react";
import { StatusBar } from "expo-status-bar";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MemberHub } from "./src/screens/MemberHub";
import { StaffHub } from "./src/screens/StaffHub";
import { BookSession } from "./src/screens/BookSession";
import { JoinClass } from "./src/screens/JoinClass";
import { ClassCalendar } from "./src/screens/ClassCalendar";
import { AddChallenge } from "./src/screens/AddChallenge";
import { MembershipRenewal } from "./src/screens/MembershipRenewal";
import { MyStats } from "./src/screens/MyStats";
import { Account } from "./src/screens/Account";
import { Notifications } from "./src/screens/Notifications";
import { Settings } from "./src/screens/Settings";
import { CommunityFeed } from "./src/screens/CommunityFeed";
import { Login } from "./src/screens/Login";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import { SettingsProvider, useSettings } from "./src/context/SettingsContext";
import type { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MemberStack() {
  const { colors } = useSettings();
  return (
    <Stack.Navigator
      initialRouteName="MemberHub"
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", color: colors.text },
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.glassStrong },
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="MemberHub" component={MemberHub} options={{ headerShown: false }} />
      <Stack.Screen name="BookSession" component={BookSession} options={{ title: "Book Session" }} />
      <Stack.Screen name="JoinClass" component={JoinClass} options={{ title: "Join Class" }} />
      <Stack.Screen name="ClassCalendar" component={ClassCalendar} options={{ title: "My Schedule" }} />
      <Stack.Screen name="AddChallenge" component={AddChallenge} options={{ title: "Add Challenge" }} />
      <Stack.Screen name="MembershipRenewal" component={MembershipRenewal} options={{ title: "Membership" }} />
      <Stack.Screen name="MyStats" component={MyStats} options={{ title: "My Stats" }} />
      <Stack.Screen name="Account" component={Account} options={{ title: "Account" }} />
      <Stack.Screen name="Notifications" component={Notifications} options={{ title: "Notifications" }} />
      <Stack.Screen name="Settings" component={Settings} options={{ title: "Settings" }} />
    </Stack.Navigator>
  );
}

function StaffStack() {
  const { colors } = useSettings();
  return (
    <Stack.Navigator
      initialRouteName="StaffHub"
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", color: colors.text },
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.glassStrong },
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="StaffHub" component={StaffHub} options={{ headerShown: false }} />
      <Stack.Screen name="Account" component={Account} options={{ title: "Account" }} />
      <Stack.Screen name="Settings" component={Settings} options={{ title: "Settings" }} />
      <Stack.Screen name="Notifications" component={Notifications} options={{ title: "Notifications" }} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const { settings, isLoaded, colors } = useSettings();

  if (!isLoaded || isLoading) {
    return null;
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <Login />
      </SafeAreaProvider>
    );
  }

  const isStaff = user.roles.includes("STAFF");

  const navTheme = settings.darkMode
    ? {
        ...DarkTheme,
        colors: { ...DarkTheme.colors, background: colors.background, card: colors.card, text: colors.text },
      }
    : {
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: colors.background, card: colors.card, text: colors.text },
      };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style={settings.darkMode ? "light" : "dark"} />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: route.name === "Community",
            headerTitleStyle: { fontWeight: "700", color: colors.text },
            headerStyle: { backgroundColor: colors.glassStrong },
            headerTintColor: colors.text,
            tabBarActiveTintColor: colors.text,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarShowLabel: true,
            tabBarStyle: {
              position: "absolute",
              height: 78,
              paddingTop: 10,
              borderTopWidth: 0,
              backgroundColor: "transparent",
              elevation: 0,
              marginHorizontal: 18,
              marginBottom: 12,
              borderRadius: 24,
              overflow: "hidden",
            },
            tabBarItemStyle: { paddingVertical: 6 },
            tabBarBackground: () => (
              <View style={StyleSheet.absoluteFill}>
                <BlurView tint={colors.blurTint} intensity={60} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={[colors.glassStrong, colors.glass]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      borderTopLeftRadius: 22,
                      borderTopRightRadius: 22,
                    },
                  ]}
                />
              </View>
            ),
            tabBarIcon: ({ color, size }) => {
              if (route.name === "Home") return <Ionicons name="home" size={size} color={color} />;
              return <Ionicons name="chatbubbles" size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen
            name="Home"
            component={isStaff ? StaffStack : MemberStack}
            options={{ title: "Home" }}
          />
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
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationsProvider>
    </SettingsProvider>
  );
}
