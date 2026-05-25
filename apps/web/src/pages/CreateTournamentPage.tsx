import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Trophy, Users, Calendar,
  MapPin, Clock, Swords, GitBranch, BarChart3, RotateCcw,
  Plus, X, Shuffle, Play, Crown, Medal, Award
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SkillBadge from "@/components/SkillBadge";

type TournamentFormat = "round_robin" | "knockout" | "ladder";
type Step = "format" | "details" | "players" | "schedule" | "review";

const steps: Step[] = ["format", "details", "players", "schedule", "review"];
const stepLabels: Record<Step, string> = {
  format: "Format",
  details: "Details",
  players: "Players",
  schedule: "Schedule",
  review: "Review",
};

const formats: { id: TournamentFormat; label: string; desc: string; icon: React.ElementType; features: string[] }[] = [
  { id: "round_robin", label: "Round Robin", desc: "Everyone plays everyone", icon: RotateCcw, features: ["Fair matchups", "All players guaranteed games", "Best for 4-12 players"] },
  { id: "knockout", label: "Knockout", desc: "Single elimination bracket", icon: GitBranch, features: ["Fast-paced", "Clear winner", "Best for 8-32 players"] },
  { id: "ladder", label: "Ladder", desc: "Challenge players above you", icon: BarChart3, features: ["Ongoing format", "Flexible scheduling", "Best for leagues"] },
];

const skillLevels = ["2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0+"];

const samplePlayers = [
  { id: 1, name: "Alex Kim", skill: "4.0", avatar: "🧑" },
  { id: 2, name: "Maria Garcia", skill: "3.5", avatar: "👩" },
  { id: 3, name: "Tom Roberts", skill: "4.5", avatar: "👨" },
  { id: 4, name: "Sarah Lee", skill: "3.0", avatar: "👩‍🦰" },
  { id: 5, name: "James Chen", skill: "4.0", avatar: "🧑‍🦱" },
  { id: 6, name: "Lisa Park", skill: "3.5", avatar: "👱‍♀️" },
  { id: 7, name: "David Wilson", skill: "4.5", avatar: "👨‍🦳" },
  { id: 8, name: "Emma Davis", skill: "3.0", avatar: "👩‍🦱" },
  { id: 9, name: "Mike Johnson", skill: "4.0", avatar: "🧔" },
  { id: 10, name: "Ana Martinez", skill: "3.5", avatar: "👩‍🦲" },
];

interface Match {
  round: number;
  match: number;
  player1: string;
  player2: string;
  score1?: number;
  score2?: number;
  winner?: string;
}

const CreateTournamentPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("format");
  const [format, setFormat] = useState<TournamentFormat | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [minSkill, setMinSkill] = useState("2.0");
  const [maxSkill, setMaxSkill] = useState("5.0+");
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [matchDuration, setMatchDuration] = useState("20");
  const [breakTime, setBreakTime] = useState("5");
  const [courtsAvailable, setCourtsAvailable] = useState("2");
  const [generatedBracket, setGeneratedBracket] = useState<Match[]>([]);
  const [launched, setLaunched] = useState(false);

  const stepIndex = steps.indexOf(currentStep);
  const canNext = () => {
    switch (currentStep) {
      case "format": return !!format;
      case "details": return name.trim() !== "" && date !== "" && location.trim() !== "";
      case "players": return selectedPlayers.length >= 4;
      case "schedule": return true;
      case "review": return true;
    }
  };

  const next = () => {
    if (stepIndex < steps.length - 1) {
      const nextStep = steps[stepIndex + 1];
      if (nextStep === "review") generateBracket();
      setCurrentStep(nextStep);
    }
  };
  const prev = () => { if (stepIndex > 0) setCurrentStep(steps[stepIndex - 1]); };

  const togglePlayer = (id: number) => {
    setSelectedPlayers(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const generateBracket = () => {
    const players = selectedPlayers.map(id => samplePlayers.find(p => p.id === id)!);
    const matches: Match[] = [];

    if (format === "round_robin") {
      let matchNum = 1;
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const round = Math.floor(matchNum / Math.ceil(players.length / 2)) + 1;
          matches.push({ round, match: matchNum++, player1: players[i].name, player2: players[j].name });
        }
      }
    } else if (format === "knockout") {
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const totalRounds = Math.ceil(Math.log2(shuffled.length));
      let matchNum = 1;
      for (let i = 0; i < shuffled.length; i += 2) {
        matches.push({
          round: 1,
          match: matchNum++,
          player1: shuffled[i].name,
          player2: shuffled[i + 1]?.name || "BYE",
        });
      }
      for (let r = 2; r <= totalRounds; r++) {
        const prevMatches = matches.filter(m => m.round === r - 1).length;
        for (let i = 0; i < Math.ceil(prevMatches / 2); i++) {
          matches.push({ round: r, match: matchNum++, player1: "TBD", player2: "TBD" });
        }
      }
    } else {
      players.forEach((p, i) => {
        matches.push({ round: 1, match: i + 1, player1: p.name, player2: "", score1: 0, score2: 0 });
      });
    }

    setGeneratedBracket(matches);
  };

  const launchTournament = () => {
    setLaunched(true);
    const params = new URLSearchParams({
      name: name,
      format: format || "round_robin",
      location: location,
    });
    setTimeout(() => navigate(`/tournament-live?${params.toString()}`), 2000);
  };

  const roundLabels = (round: number, totalRounds: number) => {
    if (format !== "knockout") return `Round ${round}`;
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semifinals";
    if (round === totalRounds - 2) return "Quarterfinals";
    return `Round ${round}`;
  };

  return (
    <div className="pb-20 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-display font-bold text-foreground">Create Tournament</h1>
            <p className="text-[11px] text-muted-foreground">{stepLabels[currentStep]} · Step {stepIndex + 1} of {steps.length}</p>
          </div>
          <Trophy className="h-5 w-5 text-accent" />
        </div>
        {/* Progress */}
        <div className="flex gap-1 mt-3">
          {steps.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="px-4 pt-4"
        >
          {/* STEP: Format */}
          {currentStep === "format" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Choose Format</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Select how your tournament will be structured</p>
              </div>
              {formats.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    format === f.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                      format === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}>
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-card-foreground">{f.label}</h3>
                        {format === f.id && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {f.features.map(feat => (
                          <span key={feat} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{feat}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP: Details */}
          {currentStep === "details" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Tournament Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Set up the basics</p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tournament Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Spring Championship" className="mt-1 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Time</Label>
                    <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Court or venue name" className="pl-9 rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Skill Range</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <select value={minSkill} onChange={e => setMinSkill(e.target.value)} className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm">
                      {skillLevels.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="text-xs text-muted-foreground">to</span>
                    <select value={maxSkill} onChange={e => setMaxSkill(e.target.value)} className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm">
                      {skillLevels.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP: Players */}
          {currentStep === "players" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground">Add Players</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedPlayers.length} selected · Min 4 players</p>
                </div>
                <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs" onClick={() => setSelectedPlayers(samplePlayers.map(p => p.id))}>
                  <Users className="h-3 w-3" /> Select All
                </Button>
              </div>
              <div className="space-y-2">
                {samplePlayers.map(player => {
                  const selected = selectedPlayers.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => togglePlayer(player.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/20"
                      }`}
                    >
                      <span className="text-2xl">{player.avatar}</span>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-card-foreground">{player.name}</p>
                        <p className="text-[11px] text-muted-foreground">Skill {player.skill}</p>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selected ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP: Schedule */}
          {currentStep === "schedule" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Schedule Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Configure match timing and courts</p>
              </div>
              <div className="space-y-3">
                <Card className="p-4 space-y-3 shadow-card">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-card-foreground">Match Duration</span>
                  </div>
                  <div className="flex gap-2">
                    {["15", "20", "25", "30"].map(d => (
                      <button
                        key={d}
                        onClick={() => setMatchDuration(d)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                          matchDuration === d ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 space-y-3 shadow-card">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent-foreground" />
                    <span className="text-sm font-semibold text-card-foreground">Break Between Matches</span>
                  </div>
                  <div className="flex gap-2">
                    {["5", "10", "15"].map(b => (
                      <button
                        key={b}
                        onClick={() => setBreakTime(b)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                          breakTime === b ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {b} min
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 space-y-3 shadow-card">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-sport-blue" />
                    <span className="text-sm font-semibold text-card-foreground">Courts Available</span>
                  </div>
                  <div className="flex gap-2">
                    {["1", "2", "3", "4"].map(c => (
                      <button
                        key={c}
                        onClick={() => setCourtsAvailable(c)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                          courtsAvailable === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {c} {parseInt(c) === 1 ? "Court" : "Courts"}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Estimated time */}
                <Card className="p-4 bg-primary/5 border-primary/20 shadow-card">
                  <div className="flex items-center gap-2 text-primary">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-semibold">Estimated Duration</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-foreground mt-1">
                    {(() => {
                      const players = selectedPlayers.length;
                      let totalMatches = 0;
                      if (format === "round_robin") totalMatches = (players * (players - 1)) / 2;
                      else if (format === "knockout") totalMatches = players - 1;
                      else totalMatches = players;
                      const courts = parseInt(courtsAvailable);
                      const parallel = Math.ceil(totalMatches / courts);
                      const mins = parallel * (parseInt(matchDuration) + parseInt(breakTime));
                      const hrs = Math.floor(mins / 60);
                      const rem = mins % 60;
                      return hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`;
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(() => {
                      const players = selectedPlayers.length;
                      let totalMatches = 0;
                      if (format === "round_robin") totalMatches = (players * (players - 1)) / 2;
                      else if (format === "knockout") totalMatches = players - 1;
                      else totalMatches = players;
                      return `${totalMatches} matches across ${courtsAvailable} court${parseInt(courtsAvailable) > 1 ? "s" : ""}`;
                    })()}
                  </p>
                </Card>
              </div>
            </div>
          )}

          {/* STEP: Review */}
          {currentStep === "review" && !launched && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Review & Launch</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Everything looks good? Let's go!</p>
              </div>

              {/* Summary card */}
              <Card className="overflow-hidden shadow-card">
                <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-display font-bold text-card-foreground">{name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                      {format?.replace("_", " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{time || "TBD"}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{selectedPlayers.length} players</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-secondary rounded-full text-secondary-foreground">{matchDuration}min matches</span>
                    <span className="px-2 py-0.5 bg-secondary rounded-full text-secondary-foreground">{breakTime}min breaks</span>
                    <span className="px-2 py-0.5 bg-secondary rounded-full text-secondary-foreground">{courtsAvailable} courts</span>
                  </div>
                </div>
              </Card>

              {/* Bracket preview */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-display font-semibold text-foreground">
                    {format === "knockout" ? "Bracket Preview" : format === "round_robin" ? "Match Schedule" : "Ladder Rankings"}
                  </h3>
                  <button onClick={generateBracket} className="text-xs text-primary font-medium flex items-center gap-1">
                    <Shuffle className="h-3 w-3" /> Reshuffle
                  </button>
                </div>

                {format === "knockout" && (
                  <div className="overflow-x-auto -mx-4 px-4">
                    <div className="flex gap-4 min-w-max">
                      {(() => {
                        const rounds = [...new Set(generatedBracket.map(m => m.round))];
                        const totalRounds = rounds.length;
                        return rounds.map(round => (
                          <div key={round} className="space-y-2 min-w-[160px]">
                            <p className="text-[11px] font-semibold text-muted-foreground text-center">
                              {roundLabels(round, totalRounds)}
                            </p>
                            {generatedBracket.filter(m => m.round === round).map((match, mi) => (
                              <Card key={mi} className="p-2.5 shadow-card space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="h-5 w-5 rounded bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground">
                                    {mi * 2 + 1}
                                  </span>
                                  <span className="text-card-foreground font-medium truncate">{match.player1}</span>
                                </div>
                                <div className="h-px bg-border" />
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="h-5 w-5 rounded bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground">
                                    {mi * 2 + 2}
                                  </span>
                                  <span className="text-card-foreground font-medium truncate">{match.player2}</span>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {format === "round_robin" && (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {generatedBracket.slice(0, 10).map((match, i) => (
                      <Card key={i} className="flex items-center justify-between p-2.5 shadow-card">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-[10px] text-muted-foreground font-mono w-4">#{match.match}</span>
                          <span className="text-xs font-medium text-card-foreground truncate">{match.player1}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground px-2">vs</span>
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <span className="text-xs font-medium text-card-foreground truncate">{match.player2}</span>
                        </div>
                      </Card>
                    ))}
                    {generatedBracket.length > 10 && (
                      <p className="text-center text-[11px] text-muted-foreground py-1">
                        +{generatedBracket.length - 10} more matches
                      </p>
                    )}
                  </div>
                )}

                {format === "ladder" && (
                  <div className="space-y-1.5">
                    {generatedBracket.map((match, i) => (
                      <Card key={i} className="flex items-center gap-3 p-2.5 shadow-card">
                        <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-accent/20 text-accent-foreground" : "bg-secondary text-secondary-foreground"
                        }`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-card-foreground">{match.player1}</span>
                        {i === 0 && <Crown className="h-3.5 w-3.5 text-accent ml-auto" />}
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {/* Launch */}
              <Button onClick={launchTournament} className="w-full rounded-xl gap-2 h-12 text-sm font-semibold">
                <Play className="h-4 w-4" /> Launch Tournament
              </Button>
            </div>
          )}

          {/* Launched success */}
          {launched && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center text-center py-16 space-y-4"
            >
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">Tournament Created!</h2>
              <p className="text-sm text-muted-foreground">Players have been notified. Good luck!</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom nav */}
      {!launched && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/90 backdrop-blur-lg border-t border-border px-4 py-3">
          <div className="flex gap-3">
            {stepIndex > 0 && (
              <Button variant="outline" onClick={prev} className="rounded-xl flex-1 gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {currentStep !== "review" && (
              <Button onClick={next} disabled={!canNext()} className="rounded-xl flex-1 gap-1">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTournamentPage;
