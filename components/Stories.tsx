import Story from "./Story";
import { styles } from "@/styles/feed.styles";
import { ScrollView } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const StoriesSection = () => {
  const stories = useQuery(api.stories.getStories);

  if (stories === undefined || stories.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.storiesContainer}
    >
      {stories.map((story) => (
        <Story
          key={story._id}
          story={{
            id: story._id,
            username: story.username,
            avatar: story.avatar,
            hasStory: story.hasStory,
          }}
        />
      ))}
    </ScrollView>
  );
};

export default StoriesSection;
