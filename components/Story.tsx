import { styles } from "@/styles/feed.styles";
import { View, Text, Image, TouchableOpacity } from "react-native";

type StoryItem = {
  id: string;
  username: string;
  avatar: string;
  hasStory: boolean;
};

type StoryProps = {
  story: StoryItem;
  seen?: boolean;
  onPress?: () => void;
};

export default function Story({ story, seen, onPress }: StoryProps) {
  return (
    <TouchableOpacity style={styles.storyWrapper} onPress={onPress}>
      <View
        style={[
          styles.storyRing,
          !story.hasStory && styles.noStory,
          seen && styles.storySeen,
        ]}
      >
        <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {story.username}
      </Text>
    </TouchableOpacity>
  );
}
