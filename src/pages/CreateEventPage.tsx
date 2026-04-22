import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, DollarSign,
  FileText, ChevronDown, Check, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { groups } from "@/data/groups";
import { toast } from "@/hooks/use-toast";

const eventTypes = [
  { id: "open_play", label: "Open Play", emoji: "🏓", desc: "Chơi tự do, xếp trận ngẫu nhiên" },
  { id: "round_robin", label: "Round Robin", emoji: "🔄", desc: "Mỗi người đấu với tất cả" },
  { id: "clinic", label: "Clinic / Dạy", emoji: "📚", desc: "Buổi hướng dẫn kỹ thuật" },
  { id: "mixer", label: "Mixer / Giao lưu", emoji: "🎉", desc: "Chơi vui, kết bạn" },
  { id: "tournament", label: "Mini Tournament", emoji: "🏆", desc: "Giải đấu nhỏ trong nhóm" },
  { id: "practice", label: "Tập luyện", emoji: "💪", desc: "Buổi tập theo chủ đề" },
];

const timeSlots = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM",
  "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
  "4:00 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM",
  "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM",
];

const dateOptions = [
  { label: "Hôm nay", value: "today" },
  { label: "Ngày mai", value: "tomorrow" },
  { label: "Thứ 4", value: "wed" },
  { label: "Thứ 5", value: "thu" },
  { label: "Thứ 6", value: "fri" },
  { label: "Thứ 7", value: "sat" },
  { label: "Chủ nhật", value: "sun" },
];

const CreateEventPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const preselectedGroupId = searchParams.get("group");

  const myGroups = groups.filter((g) => g.role === "Host");

  const [step, setStep] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(preselectedGroupId || (myGroups[0]?.id ?? ""));
  const [selectedType, setSelectedType] = useState("");
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [location, setLocation] = useState("");
  const [maxSpots, setMaxSpots] = useState("16");
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");
  const [requireApproval, setRequireApproval] = useState(true);

  const selectedGroupData = myGroups.find((g) => g.id === selectedGroup);

  // Auto-fill location from group
  const handleGroupSelect = (groupId: string) => {
    setSelectedGroup(groupId);
    const group = myGroups.find((g) => g.id === groupId);
    if (group) setLocation(group.courtName);
  };

  // Auto-fill title from event type
  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    const type = eventTypes.find((t) => t.id === typeId);
    if (type && !title) setTitle(type.label);
  };

  const canProceedStep1 = selectedGroup && selectedType;
  const canProceedStep2 = title && selectedDate && selectedTime && location && maxSpots;

  const handleCreate = () => {
    const group = myGroups.find((g) => g.id === selectedGroup);
    const type = eventTypes.find((t) => t.id === selectedType);
    const date = dateOptions.find((d) => d.value === selectedDate);

    toast({
      title: t("createEvent.success"),
      description: `${title} · ${date?.label} ${selectedTime} · ${group?.name}`,
    });

    setTimeout(() => navigate("/dashboard"), 600);
  };

  return (
    <div className="pb-20 min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-display font-bold text-foreground">{t("createEvent.title")}</h1>
            <p className="text-[10px] text-muted-foreground">{t("createEvent.step")} {step}/3</p>
          </div>
          {/* Step indicator */}
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 w-6 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-secondary"}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Step 1: Group & Type */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            {/* Select Group */}
            <section>
              <h2 className="text-sm font-display font-semibold text-foreground mb-2.5">{t("createEvent.selectGroup")}</h2>
              <div className="space-y-2">
                {myGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleGroupSelect(group.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedGroup === group.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">{group.emoji}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-card-foreground">{group.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" /> {group.courtName}
                      </p>
                    </div>
                    {selectedGroup === group.id && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Select Event Type */}
            <section>
              <h2 className="text-sm font-display font-semibold text-foreground mb-2.5">{t("createEvent.eventType")}</h2>
              <div className="grid grid-cols-2 gap-2">
                {eventTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      selectedType === type.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl">{type.emoji}</span>
                    <p className="text-xs font-semibold text-card-foreground">{type.label}</p>
                    <p className="text-[9px] text-muted-foreground text-center leading-tight">{type.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            <Button className="w-full rounded-xl" disabled={!canProceedStep1} onClick={() => setStep(2)}>
              {t("common.next")}
            </Button>
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">{t("createEvent.eventName")}</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("createEvent.eventNamePlaceholder")}
                className="rounded-xl"
              />
            </div>

            {/* Date Selection */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> {t("createEvent.date")}
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {dateOptions.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDate(d.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedDate === d.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> {t("createEvent.time")}
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      selectedTime === time
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {t("createEvent.location")}
              </label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("createEvent.locationPlaceholder")} className="rounded-xl" />
            </div>

            {/* Max Spots & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" /> {t("createEvent.maxPlayers")}
                </label>
                <Input type="number" value={maxSpots} onChange={(e) => setMaxSpots(e.target.value)} min="2" max="100" className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-primary" /> {t("createEvent.price")} (VND)
                </label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="10000" className="rounded-xl" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" /> {t("createEvent.description")}
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("createEvent.descriptionPlaceholder")}
                className="rounded-xl min-h-[80px]"
              />
            </div>

            {/* Require Approval Toggle */}
            <button
              onClick={() => setRequireApproval(!requireApproval)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card"
            >
              <div>
                <p className="text-xs font-semibold text-card-foreground">{t("createEvent.requireApproval")}</p>
                <p className="text-[10px] text-muted-foreground">{t("createEvent.requireApprovalDesc")}</p>
              </div>
              <div className={`h-6 w-11 rounded-full transition-colors flex items-center px-0.5 ${requireApproval ? "bg-primary" : "bg-secondary"}`}>
                <div className={`h-5 w-5 rounded-full bg-background shadow transition-transform ${requireApproval ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>

            <Button className="w-full rounded-xl" disabled={!canProceedStep2} onClick={() => setStep(3)}>
              {t("createEvent.preview")}
            </Button>
          </motion.div>
        )}

        {/* Step 3: Preview & Confirm */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="p-4 shadow-card border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-display font-bold text-card-foreground">{t("createEvent.previewTitle")}</h2>
              </div>

              <div className="space-y-3">
                {/* Event Title & Type */}
                <div>
                  <h3 className="text-base font-display font-bold text-card-foreground">{title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {eventTypes.find((t) => t.id === selectedType)?.emoji} {eventTypes.find((t) => t.id === selectedType)?.label}
                    </Badge>
                    {Number(price) === 0 && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">{t("common.free")}</Badge>}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("createEvent.date")}</p>
                      <p className="text-xs font-semibold text-card-foreground">{dateOptions.find((d) => d.value === selectedDate)?.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("createEvent.time")}</p>
                      <p className="text-xs font-semibold text-card-foreground">{selectedTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("createEvent.maxPlayers")}</p>
                      <p className="text-xs font-semibold text-card-foreground">{maxSpots} {t("createEvent.players")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
                    <DollarSign className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("createEvent.price")}</p>
                      <p className="text-xs font-semibold text-card-foreground">
                        {Number(price) === 0 ? t("common.free") : `${Number(price).toLocaleString()}đ`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/50">
                  <MapPin className="h-3.5 w-3.5 text-primary mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t("createEvent.location")}</p>
                    <p className="text-xs font-semibold text-card-foreground">{location}</p>
                  </div>
                </div>

                {/* Group */}
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
                  <span className="text-lg">{selectedGroupData?.emoji}</span>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t("createEvent.group")}</p>
                    <p className="text-xs font-semibold text-card-foreground">{selectedGroupData?.name}</p>
                  </div>
                </div>

                {/* Description */}
                {description && (
                  <div className="p-2.5 rounded-lg bg-secondary/50">
                    <p className="text-[10px] text-muted-foreground mb-1">{t("createEvent.description")}</p>
                    <p className="text-xs text-card-foreground leading-relaxed">{description}</p>
                  </div>
                )}

                {/* Settings */}
                <div className="flex items-center gap-2">
                  <Badge variant={requireApproval ? "default" : "secondary"} className="text-[10px]">
                    {requireApproval ? "🔒 " + t("createEvent.approvalRequired") : "🔓 " + t("createEvent.autoApprove")}
                  </Badge>
                </div>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(2)}>
                {t("common.edit")}
              </Button>
              <Button className="flex-1 rounded-xl gap-1.5" onClick={handleCreate}>
                <Check className="h-4 w-4" /> {t("createEvent.publish")}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CreateEventPage;
