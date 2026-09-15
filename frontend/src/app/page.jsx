import TopNav from "../components/ui/navbar";
import ProfileSidebarCard from "../components/home/ProfileSidebarCard";
import SkillsCard from "../components/home/SkillsCard";
import StoryRow from "../components/home/StoryRow";
import PostComposer from "../components/home/PostComposer";
import PostCard from "../components/home/PostCard";
import ActivityCard from "../components/home/ActivityCard";

const stories = [
  { id: 1, name: "Simon pk", avatar: "https://i.pravatar.cc/100?img=12" },
  { id: 2, name: "Jhon", avatar: "https://i.pravatar.cc/100?img=13" },
  { id: 3, name: "Rishal", avatar: "https://i.pravatar.cc/100?img=14" },
  { id: 4, name: "Fedrick", avatar: "https://i.pravatar.cc/100?img=15" },
  { id: 5, name: "David", avatar: "https://i.pravatar.cc/100?img=16" },
  { id: 6, name: "Chris", avatar: "https://i.pravatar.cc/100?img=17" },
];

const posts = [
  {
    id: 1,
    author: "George Jose",
    username: "george",
    verified: true,
    avatar: "https://i.pravatar.cc/100?img=13",
    time: "1 hour ago",
    text: "Lorem ipsum dolor sit amet consectetur. Porttitor.",
    image: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=900&q=80",
  },
];

const activity = [
  { id: 1, name: "George Jose", action: "Followed on you", time: "3 min ago", avatar: "https://i.pravatar.cc/100?img=13" },
  { id: 2, name: "Michel", action: "Followed on you", time: "3 min ago", avatar: "https://i.pravatar.cc/100?img=20" },
  { id: 3, name: "Cristano", action: "Followed on you", time: "3 min ago", avatar: "https://i.pravatar.cc/100?img=21" },
  { id: 4, name: "Brahim diaz", action: "Followed on you", time: "3 min ago", avatar: "https://i.pravatar.cc/100?img=22" },
  { id: 5, name: "John wick", action: "Followed on you", time: "3 min ago", avatar: "https://i.pravatar.cc/100?img=23" },
];

const skills = ["UX Designer", "Front end and Back End developer", "JS coder", "UX Designer", "UX Designer"];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-900">
      <TopNav />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6 px-6 pb-10">
        <aside className="space-y-6">
          <ProfileSidebarCard />
          <SkillsCard skills={skills} />
        </aside>

        <main className="space-y-6">
          <StoryRow stories={stories} />
          <PostComposer />
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </main>

        <aside>
          <ActivityCard activity={activity} />
        </aside>
      </div>
    </div>
  );
}