// hooks/useThemeColor.ts
import { useColorScheme } from 'react-native';

export type ThemeProps = {
  light?: string;
  dark?: string;
};

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: 'text' | 'background' | 'tint' | 'tabIconDefault' | 'tabIconSelected'
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // Fallbacks for SafeCircle
    switch (colorName) {
      case 'text':
        return theme === 'dark' ? '#fff' : '#000';
      case 'background':
        return theme === 'dark' ? '#000' : '#fff';
      case 'tint':
        return '#d32f2f'; // SafeCircle Red
      case 'tabIconDefault':
        return theme === 'dark' ? '#ccc' : '#888';
      case 'tabIconSelected':
        return '#d32f2f';
      default:
        return '#000';
    }
  }
}