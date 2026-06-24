import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Theme, Colors } from '../../constants/colors';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        (pressed || isDisabled) && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Theme.primary : Colors.ivory}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
            {label}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center' },
  iconLeft:  { marginRight: 8 },
  iconRight: { marginLeft: 8 },

  // Variants
  primary:   { backgroundColor: Theme.primary },
  secondary: { backgroundColor: Theme.secondary },
  outline:   { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Theme.primary },
  ghost:     { backgroundColor: 'transparent' },
  danger:    { backgroundColor: Theme.error },

  // Sizes
  size_sm: { paddingVertical: 8,  paddingHorizontal: 16, minHeight: 36 },
  size_md: { paddingVertical: 14, paddingHorizontal: 24, minHeight: 52 },
  size_lg: { paddingVertical: 18, paddingHorizontal: 32, minHeight: 60 },

  // Labels
  label: { fontWeight: '600', textAlign: 'center' },
  label_primary:   { color: Colors.ivory },
  label_secondary: { color: Colors.plum[900] },
  label_outline:   { color: Theme.primary },
  label_ghost:     { color: Theme.primary },
  label_danger:    { color: Colors.white },

  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 17 },

  pressed:  { opacity: 0.75 },
  disabled: { opacity: 0.45 },
});
