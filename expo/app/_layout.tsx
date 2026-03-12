import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RPIProvider } from "@/contexts/RPIContext";
import LoginScreen from "@/app/login";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="patient/[name]" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}

function AuthGate() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={gateStyles.loading}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <RPIProvider>
      <RootLayoutNav />
    </RPIProvider>
  );
}

const gateStyles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#060a14',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
