import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { strings } from "@/constants/strings";
import { goBackToCustomerHome } from "@/utils/customer-navigation";
import { AppHeader } from "@/components/app-header";

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  chipBorder: "#E5E7EB",
  openBg: "#ECFDF5",
};
const FAQ_EXPANDED_BG = UI.openBg;
const FAQ_COLLAPSED_BG = UI.card;
const ICON_BG = UI.openBg;
const ICON_BG_COLLAPSED = UI.card;
const ICON_BORDER = UI.text;
const EXPANDED_QUESTION_COLOR = UI.text;
const EXPANDED_ANSWER_COLOR = UI.muted;

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
            color={expanded ? ICON_BORDER : UI.teal}
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
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]}>
        <AppHeader
          appearance="light"
          title={s.title}
          leftIcon="arrow-left"
          onLeftPress={() => goBackToCustomerHome(router)}
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
    backgroundColor: UI.bg,
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
    borderColor: UI.chipBorder,
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
    color: UI.text,
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
    borderColor: UI.teal,
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
