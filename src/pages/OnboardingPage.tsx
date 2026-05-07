import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Trophy, MapPin, Sun, Moon, Sunrise, ChevronRight,
  ChevronLeft, Zap, Shield, Target, Store, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type RoleId = "player" | "host" | "court_owner" | "store_owner";
type SkillLevel = "beginner" | "intermediate" | "advanced" | "pro" | null;
type PlayTime = "morning" | "afternoon" | "evening" | null;
type PlayStyle = "singles" | "doubles" | "mixed" | null;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, filter: "blur(4px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, filter: "blur(4px)" }),
};

const roles = [
  { id: "player" as RoleId, emoji: "🏓", title: "Player", description: "Find games, join groups, track progress" },
  { id: "host" as RoleId, emoji: "📋", title: "Social Host", description: "Organize events, manage groups & tournaments" },
  { id: "court_owner" as RoleId, emoji: "🏟️", title: "Court Owner", description: "Manage courts and grow your venue" },
  { id: "store_owner" as RoleId, emoji: "🛒", title: "Store Owner", description: "Sell gear, accessories & equipment" },
];

const skillLevels = [
  { id: "beginner" as const, label: "Beginner", rating: "2.0–2.5", icon: Shield, color: "text-[hsl(var(--skill-beginner))]", bg: "bg-[hsl(var(--skill-beginner)/0.1)]" },
  { id: "intermediate" as const, label: "Intermediate", rating: "3.0–3.5", icon: Target, color: "text-[hsl(var(--skill-intermediate))]", bg: "bg-[hsl(var(--skill-intermediate)/0.1)]" },
  { id: "advanced" as const, label: "Advanced", rating: "4.0–4.5", icon: Zap, color: "text-[hsl(var(--skill-advanced))]", bg: "bg-[hsl(var(--skill-advanced)/0.1)]" },
  { id: "pro" as const, label: "Pro", rating: "5.0+", icon: Trophy, color: "text-[hsl(var(--skill-pro))]", bg: "bg-[hsl(var(--skill-pro)/0.1)]" },
];

const playTimes = [
  { id: "morning" as const, label: "Morning", sub: "6am – 11am", icon: Sunrise },
  { id: "afternoon" as const, label: "Afternoon", sub: "11am – 5pm", icon: Sun },
  { id: "evening" as const, label: "Evening", sub: "5pm – 10pm", icon: Moon },
];

const playStyles = [
  { id: "singles" as const, label: "Singles", emoji: "🧍" },
  { id: "doubles" as const, label: "Doubles", emoji: "👯" },
  { id: "mixed" as const, label: "Mixed Doubles", emoji: "🤝" },
];

type StepDef = { id: string; role: RoleId | "shared"; render: () => React.ReactNode };

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Shared
  const [selectedRoles, setSelectedRoles] = useState<RoleId[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  // Player
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(null);
  const [playTime, setPlayTime] = useState<PlayTime>(null);
  const [playStyle, setPlayStyle] = useState<PlayStyle>(null);

  // Host
  const [groupName, setGroupName] = useState("");
  const [groupLocation, setGroupLocation] = useState("");
  const [hostEventTypes, setHostEventTypes] = useState<string[]>([]);

  // Court owner
  const [venueName, setVenueName] = useState("");
  const [courtCount, setCourtCount] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);

  // Store owner
  const [storeName, setStoreName] = useState("");
  const [storeCategories, setStoreCategories] = useState<string[]>([]);

  const toggleRole = (id: RoleId) => {
    setSelectedRoles(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleItem = (list: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  // Build dynamic steps based on selected roles
  const steps: StepDef[] = useMemo(() => {
    const s: StepDef[] = [{ id: "roles", role: "shared", render: () => null }];

    if (selectedRoles.length > 0) {
      s.push({ id: "profile", role: "shared", render: () => null });
    }

    if (selectedRoles.includes("player")) {
      s.push({ id: "player_skill", role: "player", render: () => null });
      s.push({ id: "player_time", role: "player", render: () => null });
      s.push({ id: "player_style", role: "player", render: () => null });
    }

    if (selectedRoles.includes("host")) {
      s.push({ id: "host_group", role: "host", render: () => null });
      s.push({ id: "host_events", role: "host", render: () => null });
    }

    if (selectedRoles.includes("court_owner")) {
      s.push({ id: "court_venue", role: "court_owner", render: () => null });
      s.push({ id: "court_amenities", role: "court_owner", render: () => null });
    }

    if (selectedRoles.includes("store_owner")) {
      s.push({ id: "store_info", role: "store_owner", render: () => null });
      s.push({ id: "store_categories", role: "store_owner", render: () => null });
    }

    return s;
  }, [selectedRoles]);

  const currentStepId = steps[stepIndex]?.id || "roles";
  const totalSteps = steps.length;

  const persistPlayerProfile = async () => {
    if (!user) return;
    const initialDupr =
      skillLevel === "pro" ? 5.0 :
      skillLevel === "advanced" ? 4.0 :
      skillLevel === "intermediate" ? 3.0 :
      skillLevel === "beginner" ? 2.0 : 2.0;

    const profileUpdate: Record<string, unknown> = {
      onboarding_completed: true,
    };
    if (name.trim()) profileUpdate.display_name = name.trim();
    if (location.trim()) profileUpdate.location = location.trim();
    if (selectedRoles.includes("player")) {
      if (skillLevel) profileUpdate.skill_level = skillLevel;
      if (playTime) profileUpdate.play_time = playTime;
      if (playStyle) profileUpdate.play_style = playStyle;
      profileUpdate.dupr_rating = initialDupr;
      profileUpdate.total_xp = 100;
      profileUpdate.current_level = 1;
    }
    const sb = supabase as unknown as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: unknown) => Promise<unknown> }; insert: (v: unknown) => Promise<unknown> } };
    await sb.from("profiles").update(profileUpdate).eq("user_id", user.id);

    // Onboarding XP bonus (audit trail)
    if (selectedRoles.includes("player")) {
      await sb.from("xp_transactions").insert({
        user_id: user.id,
        amount: 100,
        source: "onboarding",
      });
    }
  };

  const submitRoleApplications = async () => {
    if (!user) return;
    const applicable = selectedRoles.filter((r) => r !== "player");
    if (applicable.length === 0) return;
    const rows = applicable.map((role) => {
      const business_info =
        role === "court_owner"
          ? { business_name: venueName, court_count: courtCount, amenities: amenities.join(", ") }
          : role === "store_owner"
          ? { business_name: storeName, categories: storeCategories.join(", ") }
          : null;
      const reasonParts: string[] = [];
      if (role === "host") {
        if (groupName) reasonParts.push(`Group: ${groupName}`);
        if (groupLocation) reasonParts.push(`Location: ${groupLocation}`);
        if (hostEventTypes.length) reasonParts.push(`Event types: ${hostEventTypes.join(", ")}`);
      }
      return {
        user_id: user.id,
        requested_role: role,
        reason: reasonParts.join(" | ") || `Submitted via onboarding flow`,
        business_info,
      };
    });
    await supabase.from("role_applications").insert(rows);

    // If user registered as Store Owner, also create a stores row so they
    // have a real store record from day one. Lowercase the categories to
    // align with the marketplace category enum.
    if (selectedRoles.includes("store_owner") && storeName.trim()) {
      const sb = supabase as unknown as { from: (t: string) => any };
      await sb.from("stores").upsert({
        owner_user_id: user.id,
        name: storeName,
        address: location || null,
        categories: storeCategories.map((c) => c.toLowerCase()),
        status: "active",
      }, { onConflict: "owner_user_id" });
    }
  };

  const goNext = async () => {
    if (stepIndex >= totalSteps - 1) {
      setSubmitting(true);
      try {
        await persistPlayerProfile();
        await submitRoleApplications();
      } catch {
        // Silent: user can retry from Settings
      }
      localStorage.setItem("pickleplay_onboarded", "true");
      setSubmitting(false);
      navigate("/");
      return;
    }
    setDirection(1);
    setStepIndex(s => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStepIndex(s => Math.max(0, s - 1));
  };

  const canProceed = () => {
    switch (currentStepId) {
      case "roles": return selectedRoles.length > 0;
      case "profile": return name.trim().length > 0;
      case "player_skill": return skillLevel !== null;
      case "player_time": return playTime !== null;
      case "player_style": return true;
      case "host_group": return groupName.trim().length > 0;
      case "host_events": return true;
      case "court_venue": return venueName.trim().length > 0;
      case "court_amenities": return true;
      case "store_info": return storeName.trim().length > 0;
      case "store_categories": return true;
      default: return false;
    }
  };

  const getRoleBadge = (role: RoleId) => {
    const r = roles.find(x => x.id === role);
    return r ? `${r.emoji} ${r.title}` : "";
  };

  const currentRole = steps[stepIndex]?.role;
  const roleBadge = currentRole && currentRole !== "shared" ? getRoleBadge(currentRole as RoleId) : null;

  const renderStep = () => {
    switch (currentStepId) {
      case "roles":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">
                How will you use MatchUp?
              </h2>
              <p className="text-sm text-muted-foreground">
                Select all that apply — you can be a player AND a host!
              </p>
            </div>
            <div className="space-y-3">
              {roles.map((role, i) => {
                const selected = selectedRoles.includes(role.id);
                return (
                  <motion.div
                    key={role.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Card
                      onClick={() => toggleRole(role.id)}
                      className={`p-4 cursor-pointer transition-all active:scale-[0.97] ${
                        selected
                          ? "ring-2 ring-primary shadow-elevated bg-primary/5"
                          : "shadow-card hover:shadow-elevated"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary/8 flex items-center justify-center text-2xl shrink-0">
                          {role.emoji}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-display font-semibold text-card-foreground">{role.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                        </div>
                        <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                          selected ? "border-primary bg-primary" : "border-border"
                        }`}>
                          {selected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {selectedRoles.length > 1 && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-xs text-muted-foreground"
              >
                🎯 {selectedRoles.length} roles selected — we'll set up each one
              </motion.p>
            )}
          </div>
        );

      case "profile":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">
                Let's set up your profile
              </h2>
              <p className="text-sm text-muted-foreground">Tell us a bit about yourself.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {selectedRoles.map(r => (
                <span key={r} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {getRoleBadge(r)}
                </span>
              ))}
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Your Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-11 px-4 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="City, State"
                  className="w-full h-11 px-4 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
              </div>
            </div>
          </div>
        );

      case "player_skill":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">
                What's your skill level?
              </h2>
              <p className="text-sm text-muted-foreground">We'll match you with the right groups.</p>
            </div>
            <div className="space-y-3">
              {skillLevels.map((level, i) => (
                <motion.div key={level.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                  <Card
                    onClick={() => setSkillLevel(level.id)}
                    className={`p-3.5 cursor-pointer transition-all active:scale-[0.97] ${skillLevel === level.id ? "ring-2 ring-primary shadow-elevated" : "shadow-card hover:shadow-elevated"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl ${level.bg} flex items-center justify-center shrink-0`}>
                        <level.icon className={`h-5 w-5 ${level.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-display font-semibold text-card-foreground">{level.label}</h3>
                        <p className="text-xs text-muted-foreground">Rating {level.rating}</p>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${skillLevel === level.id ? "border-primary bg-primary" : "border-border"}`}>
                        {skillLevel === level.id && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case "player_time":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">When do you usually play?</h2>
              <p className="text-sm text-muted-foreground">We'll prioritize games at your preferred time.</p>
            </div>
            <div className="space-y-3">
              {playTimes.map((time, i) => (
                <motion.div key={time.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                  <Card
                    onClick={() => setPlayTime(time.id)}
                    className={`p-3.5 cursor-pointer transition-all active:scale-[0.97] ${playTime === time.id ? "ring-2 ring-primary shadow-elevated" : "shadow-card hover:shadow-elevated"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                        <time.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-display font-semibold text-card-foreground">{time.label}</h3>
                        <p className="text-xs text-muted-foreground">{time.sub}</p>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${playTime === time.id ? "border-primary bg-primary" : "border-border"}`}>
                        {playTime === time.id && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case "player_style":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">What's your play style?</h2>
              <p className="text-sm text-muted-foreground">Pick your favorite — or skip for now.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {playStyles.map((style, i) => (
                <motion.div key={style.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                  <Card
                    onClick={() => setPlayStyle(style.id)}
                    className={`p-4 cursor-pointer transition-all active:scale-[0.95] text-center ${playStyle === style.id ? "ring-2 ring-primary shadow-elevated bg-primary/5" : "shadow-card hover:shadow-elevated"}`}
                  >
                    <div className="text-3xl mb-2">{style.emoji}</div>
                    <p className="text-xs font-medium text-card-foreground">{style.label}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case "host_group":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">Set up your first group</h2>
              <p className="text-sm text-muted-foreground">You can create more groups later.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Group Name</label>
                <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Sunset Smashers" className="w-full h-11 px-4 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Primary Location</label>
                <input value={groupLocation} onChange={e => setGroupLocation(e.target.value)} placeholder="Where does your group play?" className="w-full h-11 px-4 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" />
              </div>
            </div>
          </div>
        );

      case "host_events":
        const eventTypes = [
          { emoji: "🎯", label: "Open Play Sessions", desc: "Casual drop-in games" },
          { emoji: "🏆", label: "Tournaments", desc: "Competitive bracket play" },
          { emoji: "📚", label: "Clinics & Lessons", desc: "Coaching and drills" },
          { emoji: "🎉", label: "Social Mixers", desc: "Fun community events" },
        ];
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">What will you organize?</h2>
              <p className="text-sm text-muted-foreground">Select all that apply.</p>
            </div>
            <div className="space-y-3">
              {eventTypes.map((item, i) => {
                const selected = hostEventTypes.includes(item.label);
                return (
                  <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                    <Card
                      onClick={() => toggleItem(hostEventTypes, item.label, setHostEventTypes)}
                      className={`p-3.5 cursor-pointer transition-all active:scale-[0.97] ${selected ? "ring-2 ring-primary shadow-elevated bg-primary/5" : "shadow-card hover:shadow-elevated"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="flex-1">
                          <h3 className="text-sm font-display font-semibold text-card-foreground">{item.label}</h3>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "border-primary bg-primary" : "border-border"}`}>
                          {selected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );

      case "court_venue":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">Tell us about your venue</h2>
              <p className="text-sm text-muted-foreground">Help hosts and players find your courts.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Venue Name</label>
                <input value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="e.g. Bay Area Pickleball Center" className="w-full h-11 px-4 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Number of Courts</label>
                <input value={courtCount} onChange={e => setCourtCount(e.target.value)} placeholder="e.g. 8" type="number" className="w-full h-11 px-4 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" />
              </div>
            </div>
          </div>
        );

      case "court_amenities":
        const amenityList = [
          { emoji: "💡", label: "Lighting" },
          { emoji: "🅿️", label: "Parking" },
          { emoji: "🚿", label: "Restrooms" },
          { emoji: "🏪", label: "Pro Shop" },
          { emoji: "🍽️", label: "Food & Drink" },
          { emoji: "📶", label: "WiFi" },
        ];
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">Court amenities</h2>
              <p className="text-sm text-muted-foreground">Select what your venue offers.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {amenityList.map((item, i) => {
                const selected = amenities.includes(item.label);
                return (
                  <motion.div key={item.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                    <Card
                      onClick={() => toggleItem(amenities, item.label, setAmenities)}
                      className={`p-3.5 cursor-pointer transition-all active:scale-[0.95] text-center ${selected ? "ring-2 ring-primary shadow-elevated bg-primary/5" : "shadow-card hover:shadow-elevated"}`}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <p className="text-xs font-medium text-card-foreground mt-1">{item.label}</p>
                      {selected && <Check className="h-3 w-3 text-primary mx-auto mt-1" />}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );

      case "store_info":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">Set up your store</h2>
              <p className="text-sm text-muted-foreground">Tell players about your shop.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><Store className="h-3 w-3" /> Store Name</label>
                <input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="e.g. Pickle Gear Pro" className="w-full h-11 px-4 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Store Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Store address or online" className="w-full h-11 px-4 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" />
              </div>
            </div>
          </div>
        );

      case "store_categories":
        const categories = [
          { emoji: "🏓", label: "Paddles" },
          { emoji: "🎾", label: "Balls" },
          { emoji: "👟", label: "Shoes" },
          { emoji: "👕", label: "Apparel" },
          { emoji: "🎒", label: "Bags" },
          { emoji: "🧤", label: "Accessories" },
        ];
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">What do you sell?</h2>
              <p className="text-sm text-muted-foreground">Select your product categories.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((item, i) => {
                const selected = storeCategories.includes(item.label);
                return (
                  <motion.div key={item.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                    <Card
                      onClick={() => toggleItem(storeCategories, item.label, setStoreCategories)}
                      className={`p-3.5 cursor-pointer transition-all active:scale-[0.95] text-center ${selected ? "ring-2 ring-primary shadow-elevated bg-primary/5" : "shadow-card hover:shadow-elevated"}`}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <p className="text-xs font-medium text-card-foreground mt-1">{item.label}</p>
                      {selected && <Check className="h-3 w-3 text-primary mx-auto mt-1" />}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          {stepIndex > 0 && (
            <button onClick={goBack} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i <= stepIndex ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => {
              localStorage.setItem("pickleplay_onboarded", "true");
              navigate("/");
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>
        {/* Role badge */}
        {roleBadge && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/50 text-xs font-medium text-accent-foreground">
              {roleBadge} setup
            </span>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-32 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStepId}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t border-border p-4">
        <div className="max-w-md mx-auto">
          <Button
            onClick={goNext}
            disabled={!canProceed()}
            className="w-full h-12 rounded-2xl text-sm font-semibold gap-2 transition-all active:scale-[0.97]"
          >
            {isLastStep ? "Let's Play! 🏓" : "Continue"}
            {!isLastStep && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
