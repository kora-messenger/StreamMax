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
 * Welcome screen — rebuilt to the uploaded reference (2026-10-30).
 *
 * Reference geometry (512x1024 mock, measured pixel by pixel):
 *   hero            0    -> 44%   (fade into the dark background)
 *   logo icon       44.4% -> 53.7%
 *   wordmark        54.2% -> 60%
 *   tagline         61.2% -> 64.4%
 *   description     66.4% -> 69.8%
 *   feature row     73.7% -> 80%
 *   Get Started     84.8% -> 90.5%  (8.8% side margins, 60/512 tall)
 *   NO pagination dots — the CTA is the last element (explicitly requested).
 *
 * Vertical gaps scale with min(screen height, 2x width) so the reference
 * proportions hold across aspect ratios; a flexGrow spacer absorbs slack on
 * tall screens and, when the content is still taller than the screen (very
 * short devices), the ScrollView scrolls so the CTA is never clipped.
 */
const POSTER = require('../assets/img/welcome_hero.png');
const LOGO = require('../assets/img/logo_splash.png');

const BG = '#03051A';
const MAX_GRADIENT = ['#00E5FF', '#2979FF', '#7D2AE8'];

export default function WelcomeScreen({ onGetStarted }: Props) {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  // gap baseline: the reference is 2x as tall as it is wide
  const B = Math.min(H, W * 2);

  const heroH = Math.round(H * 0.44); // reference: hero is 44% of the screen height
  const logoSize = Math.round(W * 0.186);
  const wordSize = Math.round(W * 0.105);
  const tagSize = Math.max(16, Math.round(W * 0.046));
  const descSize = Math.max(12.5, Math.round(W * 0.03 * 2) / 2);
  const iconSize = Math.round(W * 0.058);
  const ctaH = Math.max(52, Math.round(W * 0.117));
  const sideMargin = Math.round(W * 0.088);

  const gap = {
    logoTop: Math.round(B * 0.004),
    wordTop: Math.round(B * 0.005),
    tagTop: Math.round(B * 0.013),
    descTop: Math.round(B * 0.02),
    featuresTop: Math.round(B * 0.039),
    ctaTop: Math.round(B * 0.048),
  };

  const features = [
    { icon: <FeatureClapper size={iconSize} />, label: 'Thousands\nof Movies & Shows' },
    { icon: <FeatureDevices size={iconSize} />, label: 'Watch on\nAny Device' },
    { icon: <FeatureBolt size={iconSize} />, label: 'High Quality\nStreaming' },
    { icon: <FeatureHeart size={iconSize} />, label: 'Personalized\nJust for You' },
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
        {/* HERO IMAGE — top, dominant */}
        <View style={{ height: heroH, width: '100%', overflow: 'hidden', backgroundColor: BG }}>
          <ImageBackground source={POSTER} style={{ width: '100%', height: '100%' }} resizeMode="cover">
            <LinearGradient
              colors={['rgba(3,5,26,0)', 'rgba(3,5,26,0.08)', 'rgba(3,5,26,0.55)', BG]}
              locations={[0, 0.5, 0.8, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          </ImageBackground>
        </View>

        {/* LOGO ICON */}
        <Image
          source={LOGO}
          style={{ width: logoSize, height: logoSize, marginTop: gap.logoTop, alignSelf: 'center' }}
          resizeMode="contain"
          accessibilityLabel="StreamMax logo"
        />

        {/* WORDMARK — white Stream + gradient Max on the same baseline */}
        <View style={[styles.titleRow, { marginTop: gap.wordTop }]} accessibilityLabel="StreamMax">
          <Text style={[styles.titleWhite, { fontSize: wordSize }]}>Stream</Text>
          <GradientText
            text="Max"
            size={wordSize}
            width={Math.round(wordSize * 2.1)}
            height={Math.round(wordSize * 1.2)}
            weight="800"
            colorsArr={MAX_GRADIENT}
          />
        </View>

        {/* TAGLINE */}
        <Text style={[styles.tagline, { fontSize: tagSize, marginTop: gap.tagTop }]}>
          Your Movies. Your Way.
        </Text>

        {/* DESCRIPTION */}
        <Text
          style={[
            styles.description,
            { fontSize: descSize, marginTop: gap.descTop, maxWidth: W * 0.72 },
          ]}
        >
          Discover, stream and enjoy the best movies, TV shows and more
          {' — '}all in one place.
        </Text>

        {/* FOUR FEATURES */}
        <View style={[styles.featuresRow, { width: W - 24, marginTop: gap.featuresTop }]}>
          {features.map((feature, index) => (
            <View key={feature.label} style={styles.feature}>
              {index !== 0 && <View style={styles.separator} />}
              {feature.icon}
              <Text style={styles.featureText}>{feature.label}</Text>
            </View>
          ))}
        </View>

        {/* slack absorber (tall screens) */}
        <View style={styles.spacer} />

        {/* GET STARTED — final element, no dots below it */}
        <View style={[styles.bottomSection, { marginTop: gap.ctaTop, paddingHorizontal: sideMargin }]}>
          <Pressable
            onPress={onGetStarted ?? (() => nav.navigate('CreateAccount'))}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            style={({ pressed }) => [styles.buttonWrapper, pressed && styles.buttonPressed]}
          >
            <LinearGradient
              colors={['#971BFA', '#6031FF', '#086CFF']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.button, { height: ctaH, borderRadius: ctaH / 2 }]}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={Math.round(ctaH * 0.42)} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { flexGrow: 1 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  titleWhite: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -1.5,
  },

  tagline: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    alignSelf: 'center',
  },

  description: {
    color: '#C6CDDF',
    lineHeight: 22,
    textAlign: 'center',
    alignSelf: 'center',
  },

  featuresRow: {
    flexDirection: 'row',
    alignSelf: 'center',
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

  spacer: { flexGrow: 1, minHeight: 0 },

  bottomSection: { width: '100%', alignItems: 'center' },

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
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    paddingHorizontal: 20,
  },
  buttonText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
});
