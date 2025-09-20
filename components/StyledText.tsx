// components/StyledText.tsx
import { Text, type TextProps, StyleSheet } from 'react-native';

export type StyledTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function StyledText({ style, type = 'default', ...rest }: StyledTextProps) {
  return (
    <Text
      style={[
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    color: '#000', // Default black text
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: '#000',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
    color: '#d32f2f', // SafeCircle Red
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#d32f2f', // Use brand red for links
    textDecorationLine: 'underline',
  },
});