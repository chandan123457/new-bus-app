import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { userAPI } from '../services/api';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const ForgotPasswordScreen = ({ navigation, route }) => {
  const initialEmail = route?.params?.email || '';

  const [step, setStep] = useState('REQUEST'); // REQUEST | RESET
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const canSendOtp = useMemo(() => isValidEmail(email) && !loading, [email, loading]);
  const canReset = useMemo(() => {
    if (loading) return false;
    if (!isValidEmail(email)) return false;
    if (!otp.trim()) return false;
    if (!newPassword) return false;
    if (newPassword.length < 6) return false;
    if (newPassword !== confirmPassword) return false;
    return true;
  }, [loading, email, otp, newPassword, confirmPassword]);

  const requestOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await userAPI.forgotPassword(normalizedEmail);
      if (!result.success) {
        throw new Error(result.error || 'Failed to request OTP');
      }

      Alert.alert('OTP Sent', result.message || 'If an account exists, an OTP has been sent.');
      setStep('RESET');
    } catch (err) {
      Alert.alert('Failed', err.message || 'Unable to request password reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordNow = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!otp.trim()) {
      Alert.alert('Missing OTP', 'Please enter the OTP sent to your email.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please make sure both password fields match.');
      return;
    }

    setLoading(true);
    try {
      const result = await userAPI.resetPassword({
        email: normalizedEmail,
        otp: otp.trim(),
        newPassword,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to reset password');
      }

      Alert.alert('Password Reset', result.message || 'Password reset successfully.', [
        {
          text: 'Go to Sign In',
          onPress: () => {
            navigation.navigate('SignIn', { prefillEmail: normalizedEmail });
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Reset Failed', err.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Forgot Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.subtitle}>
            {step === 'REQUEST'
              ? 'Enter your registered email to receive an OTP.'
              : 'Enter the OTP and set a new password.'}
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {step === 'RESET' && (
            <>
              <Text style={styles.label}>OTP</Text>
              <TextInput
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter OTP"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                editable={!loading}
              />

              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                editable={!loading}
              />

              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                editable={!loading}
              />
            </>
          )}

          {step === 'REQUEST' ? (
            <TouchableOpacity
              style={[styles.primaryBtn, !canSendOtp && styles.primaryBtnDisabled]}
              onPress={requestOtp}
              disabled={!canSendOtp}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, !canReset && styles.primaryBtnDisabled]}
                onPress={resetPasswordNow}
                disabled={!canReset}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Reset Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkBtn}
                onPress={requestOtp}
                disabled={loading}
                activeOpacity={0.75}
              >
                <Text style={styles.linkText}>Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('SignIn', { prefillEmail: email.trim().toLowerCase() })}
            disabled={loading}
            activeOpacity={0.75}
          >
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
    width: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  subtitle: {
    color: '#334155',
    fontSize: 13,
    marginBottom: 12,
  },
  label: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  primaryBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ForgotPasswordScreen;
