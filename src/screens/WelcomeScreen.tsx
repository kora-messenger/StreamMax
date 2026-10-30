import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Pressable,
  StatusBar,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import LinearGradient from 'react-native-linear-gradient';
import { GradientText } from '../components/ui';
import { FeatureBolt, FeatureClapper, FeatureDevices, FeatureHeart } from '../components/icons';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = {
  onGetStarted?: () => void;
};

/**
 * Welcome screen — refined 2026-10-30.
 *  - "Max" carries the cyan -> blue -> purple gradient directly on the
 *    letters (real SVG gradient text, no box behind it), baseline-locked
 *    to the white "Stream".
 *  - The whole column lives in a flexGrow ScrollView: on tall screens the
 *    spacer pins Get Started near the bottom; on short screens the content
 *    scrolls instead of clipping the button.
 *  - Bottom padding respects the safe-area inset (gesture and 3-button nav),
 *    so the CTA is always fully visible and tappable.
 */
const POSTER = require('../assets/img/welcome_hero.png');
const LOGO = require('../assets/img/logo_splash.png');

const MAX_GRADIENT = ['#00E5FF', '#2979FF', '#7D2AE8'];

export default function WelcomeScreen({ onGetStarted }: Props) {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const compact = height < 740;
  const posterHeight = Math.round(Math.min(height * 0.39, 380));

  const logoSize = compact ? 64 : 76;
  const wordSize = compact ? 38 : 43;
  const taglineSize = compact ? 18 : 20;
  const featureIcon = compact ? 28 : 32;

  const features = [
    { icon: <FeatureClapper size={featureIcon} />, label: 'Thousands\nof Movies & Shows' },
    { icon: <FeatureDevices size={featureIcon} />, label: 'Watch on\nAny Device' },
    { icon: <FeatureBolt size={featureIcon} />, label: 'High Quality\nStreaming' },
    { icon: <FeatureHeart size={featureIcon} />, label: 'Personalized\nJust for You' },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 14) + 18 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* EXISTING CINEMATIC MOVIE POSTER */}
        <View style={[styles.posterContainer, { height: posterHeight }]}>
          <ImageBackground
            source={POSTER}
            style={styles.poster}
            resizeMode="cover"
          >
            <LinearGradient
              colors={[
                'rgba(3,5,26,0)',
                'rgba(3,5,26,0.08)',
                'rgba(3,5,26,0.55)',
                '#03051A',
              ]}
              locations={[0, 0.5, 0.8, 1]}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              }}
            />
          </ImageBackground>
        </View>

        {/* STREAMMAX BRANDING */}
        <View style={styles.brandSection}>
          <Image
            source={LOGO}
            style={[styles.logo, { width: logoSize, height: logoSize }]}
            resizeMode="contain"
            accessibilityLabel="StreamMax logo"
          />

          {/* wordmark: white "Stream" + gradient "Max" on the same baseline */}
          <View style={styles.titleRow} accessibilityLabel="StreamMax">
            <Text
              style={[
                styles.titleWhite,
                { fontSize: wordSize, letterSpacing: -1.5 },
              ]}
            >
              Stream
            </Text>
            <GradientText
              text="Max"
              size={wordSize}
              width={Math.round(wordSize * 2.1)}
              height={Math.round(wordSize * 1.2)}
              weight="800"
              colorsArr={MAX_GRADIENT}
            />
          </View>

          <Text style={[styles.tagline, { fontSize: taglineSize }]}>
            Your Movies. Your Way.
          </Text>

          <Text style={styles.description}>
            Discover, stream and enjoy the best movies, TV shows and more
            {' — '}all in one place.
          </Text>
        </View>

        {/* FOUR FEATURE ITEMS */}
        <View
          style={[
            styles.featuresRow,
            { width: width - 24 },
            compact && styles.compactFeatures,
          ]}
        >
          {features.map((feature, index) => (
            <View key={feature.label} style={styles.feature}>
              {index !== 0 && <View style={styles.separator} />}

              {feature.icon}

              <Text style={styles.featureText}>
                {feature.label}
              </Text>
            </View>
          ))}
        </View>

        {/* flexible spacer: pins the CTA on tall screens, collapses when the
            content is taller than the screen (then the screen scrolls) */}
        <View style={styles.spacer} />

        {/* GET STARTED BUTTON */}
        <View style={styles.bottomSection}>
          <Pressable
            onPress={onGetStarted ?? (() => nav.navigate('CreateAccount'))}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            style={({ pressed }) => [
              styles.buttonWrapper,
              pressed && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={['#971BFA', '#6031FF', '#086CFF']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                Get Started
              </Text>

              <Ionicons
                name="arrow-forward"
                size={25}
                color="#FFFFFF"
              />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#03051A',
  },

  content: {
    flexGrow: 1,
  },

  posterContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#03051A',
  },

  poster: {
    width: '100%',
    height: '100%',
  },

  brandSection: {
    alignItems: 'center',
    paddingHorizontal: 25,
    marginTop: -2,
  },

  logo: {
    marginBottom: 4,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  titleWhite: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  tagline: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },

  description: {
    color: '#C6CDDF',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 440,
  },

  featuresRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 8,
  },

  compactFeatures: {
    marginTop: 16,
    marginBottom: 6,
  },

  feature: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
    position: 'relative',
  },

  separator: {
    position: 'absolute',
    left: 0,
    top: 3,
    height: 77,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(148,163,184,0.25)',
  },

  featureText: {
    color: '#E5E7F0',
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },

  spacer: {
    flexGrow: 1,
    minHeight: 16,
  },

  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 24,
  },

  buttonWrapper: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 40,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },

  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  button: {
    minHeight: 60,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },
});
