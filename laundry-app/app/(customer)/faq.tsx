import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { AppHeader } from "@/components/app-header";

const c = theme.colors;
const FAQ_EXPANDED_BG = c.blue500;
const FAQ_COLLAPSED_BG = c.blue900;
const ICON_BG = c.blue500;
const ICON_BG_COLLAPSED = c.blue900;
const ICON_BORDER = c.black;
const EXPANDED_QUESTION_COLOR = c.themeBlack;
const EXPANDED_ANSWER_COLOR = c.themeGray;

type FAQItem = {
  question: string;
  answer: string;
};

function FAQAccordionItem({
  item,
  expanded,
  onPress,
}: {
  item: FAQItem;
  expanded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.faqCard,
        expanded ? styles.faqCardExpanded : styles.faqCardCollapsed,
      ]}
    >
      <View style={styles.faqHeader}>
        <Text
          style={[
            styles.faqQuestion,
            expanded ? styles.faqQuestionExpanded : styles.faqQuestionCollapsed,
          ]}
        >
          {item.question}
        </Text>
        <View
          style={[
            styles.iconWrapperExpanded,
            expanded ? styles.iconWrapperExpanded : styles.iconWrapperCollapsed,
          ]}
        >
          <MaterialCommunityIcons
            name={expanded ? "minus" : "plus"}
            size={18}
            color={expanded ? ICON_BORDER : c.white}
          />
        </View>
      </View>
      {expanded && <Text style={styles.faqAnswer}>{item.answer}</Text>}
    </Pressable>
  );
}

export default function FAQScreen() {
  const router = useRouter();
  const s = strings.customer.faq;
  const items: readonly FAQItem[] = s.items;

  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  const toggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? -1 : index));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]}>
        <AppHeader
          title={s.title}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel="Go back"
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, index) => (
          <View key={index} style={styles.faqCardWrapper}>
            <FAQAccordionItem
              item={item}
              expanded={expandedIndex === index}
              onPress={() => toggle(index)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  pressed: {
    opacity: 0.8,
  },
  faqCardWrapper: {
    marginBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  faqCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  faqCardExpanded: {
    backgroundColor: FAQ_EXPANDED_BG,
  },
  faqCardCollapsed: {
    backgroundColor: FAQ_COLLAPSED_BG,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  faqQuestionExpanded: {
    color: EXPANDED_QUESTION_COLOR,
  },
  faqQuestionCollapsed: {
    color: c.white,
  },
  iconWrapperExpanded: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ICON_BG,
    borderWidth: 1,
    borderColor: ICON_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapperCollapsed: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ICON_BG_COLLAPSED,
    borderWidth: 1,
    borderColor: c.white,
    alignItems: "center",
    justifyContent: "center",
  },
  faqAnswer: {
    marginTop: 12,
    fontSize: 14,
    color: EXPANDED_ANSWER_COLOR,
    lineHeight: 22,
  },
});
