import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, Mail, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, loginError, credentials } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showCredentials, setShowCredentials] = useState<boolean>(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handleLogin = useCallback(() => {
    const success = login(email, password);
    if (!success) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [email, password, login, shakeAnim]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <View style={styles.logoWrap}>
              <Shield size={40} color="#60a5fa" />
            </View>
            <Text style={styles.brandTitle}>RPI LIVE v5</Text>
            <Text style={styles.brandSub}>RelVersiv Prognosis Index</Text>
            <Text style={styles.loginHint}>Sign in with your site credentials</Text>
          </View>

          <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <View style={styles.inputRow}>
                <Mail size={18} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="login-email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputRow}>
                <Lock size={18} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  testID="login-password"
                />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
            </View>

            {loginError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.loginBtn, (!email || !password) && styles.loginBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={!email || !password}
              testID="login-button"
            >
              <Text style={styles.loginBtnText}>Sign In</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.credToggle}
            onPress={() => setShowCredentials((p) => !p)}
            activeOpacity={0.7}
          >
            <Text style={styles.credToggleText}>
              {showCredentials ? 'Hide' : 'Show'} demo credentials
            </Text>
          </TouchableOpacity>

          {showCredentials && (
            <View style={styles.credCard}>
              <Text style={styles.credTitle}>Demo Site Credentials</Text>
              {credentials.map((c) => (
                <TouchableOpacity
                  key={c.site}
                  style={styles.credRow}
                  onPress={() => { setEmail(c.email); setPassword(c.password); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.credInfo}>
                    <Text style={styles.credSite}>{c.label}</Text>
                    <Text style={styles.credEmail}>{c.email}</Text>
                  </View>
                  <Text style={styles.credTap}>Tap to fill</Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.credNote}>
                Each site login shows only that site's patients. Admin sees all.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#060a14',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 36,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#0d1835',
    borderWidth: 2,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  loginHint: {
    fontSize: 13,
    color: '#475569',
    marginTop: 16,
  },
  formCard: {
    backgroundColor: '#0d1526',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 16,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#93c5fd',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060e1e',
    borderWidth: 1,
    borderColor: '#1e4a7f',
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    paddingVertical: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#991b1b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#fca5a5',
    fontWeight: '600',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 6,
  },
  loginBtnDisabled: {
    opacity: 0.4,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  credToggle: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  credToggleText: {
    fontSize: 13,
    color: '#60a5fa',
    fontWeight: '600',
  },
  credCard: {
    backgroundColor: '#0d1835',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  credTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#93c5fd',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  credInfo: {
    flex: 1,
  },
  credSite: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  credEmail: {
    fontSize: 12,
    color: '#64748b',
  },
  credTap: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '700',
  },
  credNote: {
    fontSize: 11,
    color: '#475569',
    marginTop: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
