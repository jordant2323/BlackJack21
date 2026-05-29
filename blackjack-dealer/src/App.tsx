import { useState, useEffect } from "react";
import { useBlackjack, calculateHandValue, getPayoutResult, Card, Player } from "./hooks/useBlackjack";
import { useAmbientMusic } from "./hooks/useAmbientMusic";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

const CHIP_DENOMINATIONS = [
  { amount: 1,   color: "bg-white text-gray-900 border-gray-400",    label: "1"   },
  { amount: 5,   color: "bg-red-600 text-white border-red-800",       label: "5"   },
  { amount: 25,  color: "bg-green-600 text-white border-green-800",   label: "25"  },
  { amount: 100, color: "bg-gray-900 text-white border-gray-600",     label: "100" },
  { amount: 500, color: "bg-purple-700 text-white border-purple-900", label: "500" },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function Chip({ amount, color, label, onClick, testId }: {
  amount: number; color: string; label: string; onClick: () => void; testId: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.15, y: -3 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      data-testid={testId}
      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-4 font-bold text-xs shadow-lg
        flex items-center justify-center cursor-pointer select-none ${color}`}
      title={`+${amount} chips`}
    >
      {label}
    </motion.button>
  );
}

function PlayingCard({ card, index, small }: { card: Card; index: number; small?: boolean }) {
  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  const suitChar =
    card.suit === "hearts" ? "♥" :
    card.suit === "diamonds" ? "♦" :
    card.suit === "clubs" ? "♣" : "♠";

  const w = small ? 48 : 80;
  const h = small ? 68 : 112;
  const rankSize = small ? "text-sm" : "text-lg";
  const suitSize = small ? "text-xl" : "text-3xl";
  const offset = small ? 16 : 25;
  const topOffset = small ? 3 : 5;

  return (
    <motion.div
      initial={{ y: -80, opacity: 0, scale: 0.5 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`absolute rounded-lg shadow-xl border-2 flex flex-col justify-between p-1 bg-white
        ${!card.faceUp ? "card-back-pattern border-gray-800" : "border-gray-200"}`}
      style={{
        width: w, height: h,
        left: `${index * offset}px`,
        top: `${index * topOffset}px`,
        zIndex: index,
      }}
      data-testid={`card-${card.id}`}
    >
      {card.faceUp && (
        <>
          <div className={`${rankSize} font-bold ${isRed ? "text-red-600" : "text-gray-900"} leading-none`}>
            {card.rank}
          </div>
          <div className={`${suitSize} text-center ${isRed ? "text-red-600" : "text-gray-900"}`}>
            {suitChar}
          </div>
          <div className={`${rankSize} font-bold ${isRed ? "text-red-600" : "text-gray-900"} leading-none rotate-180`}>
            {card.rank}
          </div>
        </>
      )}
    </motion.div>
  );
}

function PlayerSeat({
  player,
  index,
  totalPlayers,
  isPayoutPhase,
  dealerCards,
  isMobile,
  paidThisRound,
  onPayout,
  onCollect,
}: {
  player: Player;
  index: number;
  totalPlayers: number;
  isPayoutPhase: boolean;
  dealerCards: Card[];
  isMobile: boolean;
  paidThisRound: number;
  onPayout: (amount: number, correctPayout: number) => void;
  onCollect: () => void;
}) {
  const angle = -45 + (90 / (totalPlayers - 1)) * index;
  const radius = isMobile ? 130 : 300;
  const vertOffset = isMobile ? -60 : -100;

  const hand = player.hands[0];
  const result = hand && isPayoutPhase ? getPayoutResult(hand, dealerCards) : null;
  const remaining = result ? Math.max(0, result.correctPayout - paidThisRound) : 0;
  const fullyPaid = result?.outcome !== "lost" && result !== null && remaining === 0;

  const outcomeColor =
    result?.outcome === "won" || result?.outcome === "blackjack" ? "text-amber-400" :
    result?.outcome === "push" ? "text-blue-300" : "text-red-400";

  const outcomeLabel =
    result?.outcome === "blackjack" ? "BLACKJACK" :
    result?.outcome === "won" ? "WIN" :
    result?.outcome === "push" ? "PUSH" :
    result?.outcome === "lost" ? "LOSE" :
    hand?.status !== "playing" ? hand?.status?.toUpperCase() : "";

  const cardAreaW = isMobile ? 72 : 128;
  const cardAreaH = isMobile ? 80 : 128;

  return (
    <div
      className="absolute flex flex-col items-center gap-1 transform-gpu"
      style={{
        left: `calc(50% + ${Math.sin(angle * Math.PI / 180) * radius}px)`,
        bottom: `calc(15% + ${Math.cos(angle * Math.PI / 180) * vertOffset}px)`,
        transform: "translateX(-50%)",
      }}
      data-testid={`player-seat-${player.id}`}
    >
      <div className={`bg-black/50 px-2 py-0.5 rounded-full text-white/90 font-bold border border-white/10 shadow-lg
        ${isMobile ? "text-xs" : "text-sm"} px-3 py-1`}>
        {player.name}
      </div>
      <div className={`text-amber-400 font-mono ${isMobile ? "text-xs" : "text-sm"}`}>${player.chips}</div>

      {/* Cards */}
      <div className="relative" style={{ width: cardAreaW, height: cardAreaH }}>
        {player.hands.map(h => (
          <div key={h.id} className="relative w-full h-full">
            {h.cards.map((c, i) => (
              <PlayingCard key={c.id} card={c} index={i} small={isMobile} />
            ))}
            <div className={`absolute w-full text-center font-bold
              ${isMobile ? "text-[10px] -bottom-4" : "text-xs -bottom-5"}
              ${isPayoutPhase ? outcomeColor : "text-white/70"}`}
            >
              {isPayoutPhase ? outcomeLabel : (h.status !== "playing" ? h.status.toUpperCase() : `$${h.bet}`)}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop-only inline payout controls */}
      <AnimatePresence>
        {isPayoutPhase && result && !isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="mt-8 flex flex-col items-center gap-2"
          >
            {result.outcome !== "lost" && (
              <div className="text-white/50 text-xs font-mono text-center">
                {fullyPaid ? (
                  <span className="text-green-400 font-bold">PAID ✓</span>
                ) : (
                  <>Owe <span className="text-amber-400 font-bold">${remaining}</span> of ${result.correctPayout}</>
                )}
              </div>
            )}
            {result.outcome !== "lost" && !fullyPaid && (
              <div className="flex gap-1">
                {CHIP_DENOMINATIONS.map(chip => (
                  <Chip
                    key={chip.amount}
                    {...chip}
                    onClick={() => onPayout(chip.amount, result.correctPayout)}
                    testId={`chip-${player.id}-${chip.amount}`}
                  />
                ))}
              </div>
            )}
            {result.outcome === "lost" ? (
              <button
                data-testid={`btn-collect-${player.id}`}
                className="mt-1 px-4 py-1 bg-red-700/80 hover:bg-red-600 border border-red-500 text-white text-xs font-bold rounded-full shadow transition-colors"
                onClick={onCollect}
              >
                COLLECT BET
              </button>
            ) : !fullyPaid ? (
              <button
                data-testid={`btn-pay-exact-${player.id}`}
                className="px-3 py-1 bg-amber-600/80 hover:bg-amber-500 border border-amber-400 text-white text-xs font-bold rounded-full shadow transition-colors"
                onClick={() => onPayout(result.correctPayout, result.correctPayout)}
              >
                PAY EXACT
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mobile payout panel — slide up from bottom
function MobilePayoutPanel({
  players,
  dealerCards,
  payoutsThisRound,
  onPayout,
  onCollect,
  onFinish,
}: {
  players: Player[];
  dealerCards: Card[];
  payoutsThisRound: Record<string, number>;
  onPayout: (playerId: string, amount: number, correctPayout: number) => void;
  onCollect: (playerId: string) => void;
  onFinish: () => void;
}) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#111827] border-t-2 border-amber-600/40 rounded-t-2xl shadow-2xl"
    >
      <div className="px-4 pt-3 pb-2">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />
        <div className="text-amber-400/80 text-xs font-mono tracking-wider text-center mb-3">
          PAY OUT WINNERS
        </div>

        <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
          {players.map(player => {
            const hand = player.hands[0];
            if (!hand) return null;
            const result = getPayoutResult(hand, dealerCards);
            const paid = payoutsThisRound[player.id] ?? 0;
            const remaining = Math.max(0, result.correctPayout - paid);
            const fullyPaid = result.outcome !== "lost" && remaining === 0;

            const outcomeColor =
              result.outcome === "won" || result.outcome === "blackjack" ? "text-amber-400" :
              result.outcome === "push" ? "text-blue-300" : "text-red-400";

            const outcomeLabel =
              result.outcome === "blackjack" ? "BLACKJACK" :
              result.outcome === "won" ? "WIN" :
              result.outcome === "push" ? "PUSH" : "LOSE";

            return (
              <div key={player.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2">
                {/* Player info */}
                <div className="w-16 shrink-0">
                  <div className="text-white font-bold text-sm">{player.name}</div>
                  <div className={`text-xs font-bold ${outcomeColor}`}>{outcomeLabel}</div>
                  <div className="text-white/40 text-xs font-mono">${player.chips}</div>
                </div>

                {/* Bet / owe hint */}
                <div className="text-white/40 text-xs font-mono shrink-0">
                  <div>Bet ${hand.bet}</div>
                  {result.outcome !== "lost" && (
                    fullyPaid
                      ? <div className="text-green-400 font-bold">PAID ✓</div>
                      : <div className="text-amber-400/80">Owe <span className="font-bold">${remaining}</span></div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex-1 flex flex-col gap-1.5 items-end">
                  {result.outcome === "lost" ? (
                    <button
                      onClick={() => onCollect(player.id)}
                      data-testid={`btn-collect-${player.id}`}
                      className="px-3 py-1.5 bg-red-700/80 active:bg-red-600 border border-red-500 text-white text-xs font-bold rounded-full shadow"
                    >
                      COLLECT BET
                    </button>
                  ) : fullyPaid ? (
                    <span className="text-green-400 text-lg">✓</span>
                  ) : (
                    <>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {CHIP_DENOMINATIONS.map(chip => (
                          <Chip
                            key={chip.amount}
                            {...chip}
                            onClick={() => onPayout(player.id, chip.amount, result.correctPayout)}
                            testId={`chip-${player.id}-${chip.amount}`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => onPayout(player.id, result.correctPayout, result.correctPayout)}
                        data-testid={`btn-pay-exact-${player.id}`}
                        className="px-3 py-1 bg-amber-600/80 active:bg-amber-500 border border-amber-400 text-white text-xs font-bold rounded-full shadow"
                      >
                        PAY EXACT
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onFinish}
          data-testid="btn-finish-payouts"
          className="mt-3 w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm tracking-wider active:opacity-80"
        >
          DONE — NEXT ROUND
        </button>
        <div className="h-safe-area-inset-bottom" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>
    </motion.div>
  );
}

export default function App() {
  const {
    state,
    placeBetsAndDeal,
    dealerReveal,
    dealerHit,
    dealerStand,
    payoutChips,
    collectBet,
    finishPayouts,
    nextRound,
    payoutsThisRound,
  } = useBlackjack();

  const isMobile = useIsMobile();
  const { playing: musicPlaying, toggle: toggleMusic } = useAmbientMusic();

  const dVal = calculateHandValue(state.dealerCards).total;
  const dValFaceUp = calculateHandValue(state.dealerCards.filter(c => c.faceUp)).total;

  const canHit = state.phase === "dealer_turn" && dVal < 17;
  const canStand = state.phase === "dealer_turn" && dVal >= 17;
  const isPayoutPhase = state.phase === "payouts";

  return (
    <div className="h-screen w-full bg-background flex flex-col font-sans overflow-hidden">

      {/* Top stats */}
      <div className="absolute top-3 left-3 flex gap-3 text-xs font-mono text-white/50 z-10">
        <div>R{state.round}</div>
        <div>W:{state.houseWins}/L:{state.houseLosses}</div>
        <div>{Math.round((state.deck.length / state.shoeSize) * 100)}%</div>
      </div>

      {/* Payout counter */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end">
        <div className="text-[10px] font-mono text-white/40 tracking-widest uppercase">Paid Out</div>
        <motion.div
          key={state.totalPaidOut}
          initial={{ scale: 1.3, color: "#fbbf24" }}
          animate={{ scale: 1, color: "rgba(251,191,36,0.9)" }}
          transition={{ duration: 0.4 }}
          className="text-lg font-bold font-mono text-amber-400/90 leading-none"
          data-testid="stat-total-paid-out"
        >
          ${state.totalPaidOut.toLocaleString()}
        </motion.div>
      </div>

      {/* Table */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden">

        {/* Felt arc */}
        <div className="absolute bottom-0 w-[150vw] h-[75vh] border-[12px] sm:border-[16px] border-[#132c1c] bg-[#1a4a2e] rounded-t-[100%] shadow-2xl">
          <div className="absolute inset-3 border border-white/10 rounded-t-[100%]" />
        </div>

        {/* Blackjack felt logo — center of table */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none pointer-events-none z-0">
          {/* Top suits row */}
          <div className="flex gap-3 mb-1">
            <span className="text-red-500/25 text-xl sm:text-2xl">♥</span>
            <span className="text-white/20 text-xl sm:text-2xl">♠</span>
            <span className="text-red-500/25 text-xl sm:text-2xl">♦</span>
            <span className="text-white/20 text-xl sm:text-2xl">♣</span>
          </div>
          {/* Logo text */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-red-500/30 text-2xl sm:text-3xl">♦</span>
            <span
              className="text-white/20 font-black tracking-[0.18em] text-xl sm:text-3xl uppercase"
              style={{ fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}
            >
              Blackjack
            </span>
            <span className="text-white/25 text-2xl sm:text-3xl">♠</span>
          </div>
          {/* Bottom suits row */}
          <div className="flex gap-3 mt-1">
            <span className="text-white/20 text-xl sm:text-2xl">♣</span>
            <span className="text-red-500/25 text-xl sm:text-2xl">♦</span>
            <span className="text-white/20 text-xl sm:text-2xl">♠</span>
            <span className="text-red-500/25 text-xl sm:text-2xl">♥</span>
          </div>
          <div className="text-white/15 text-[9px] sm:text-[10px] tracking-[0.3em] mt-1 uppercase font-mono">
            Pays 3 to 2
          </div>
        </div>

        {/* Dealer */}
        <div className="absolute flex flex-col items-center" style={{ top: isMobile ? "8%" : "20%" }}>
          <div className={`text-white/40 font-bold tracking-widest ${isMobile ? "text-[10px] mb-2" : "text-sm mb-4"}`}>
            DEALER MUST STAND ON 17
          </div>
          <div className="relative" style={{ width: isMobile ? 80 : 128, height: isMobile ? 80 : 128 }}>
            <AnimatePresence>
              {state.dealerCards.map((c, i) => (
                <PlayingCard key={c.id} card={c} index={i} small={isMobile} />
              ))}
            </AnimatePresence>
          </div>
          {state.dealerCards.length > 0 && (
            <div className={`bg-black/50 px-3 py-0.5 rounded text-white font-mono border border-white/10
              ${isMobile ? "text-sm mt-4" : "mt-6"}`}>
              {state.phase === "dealer_turn" || state.phase === "payouts" || state.phase === "round_over"
                ? dVal : dValFaceUp}
            </div>
          )}
        </div>

        {/* Players */}
        {state.players.map((p, i) => (
          <PlayerSeat
            key={p.id}
            player={p}
            index={i}
            totalPlayers={state.players.length}
            isPayoutPhase={isPayoutPhase}
            dealerCards={state.dealerCards}
            isMobile={isMobile}
            paidThisRound={payoutsThisRound[p.id] ?? 0}
            onPayout={(amount, correctPayout) => payoutChips(p.id, amount, correctPayout)}
            onCollect={() => collectBet(p.id)}
          />
        ))}

        {/* Shuffling overlay */}
        <AnimatePresence>
          {state.phase === "shuffling" && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
            >
              <div className={`text-white font-bold tracking-widest ${isMobile ? "text-xl" : "text-3xl"}`}>
                SHUFFLING SHOE...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer controls */}
      <footer className={`bg-card border-t border-card-border flex items-center justify-center gap-3 px-4 z-40 relative
        ${isMobile ? "h-20" : "h-24"}`}
      >
        {/* Music toggle — always visible */}
        <button
          onClick={toggleMusic}
          data-testid="btn-music-toggle"
          className="absolute left-4 p-2 rounded-full text-white/40 hover:text-white/80 active:text-white transition-colors"
          title={musicPlaying ? "Mute music" : "Play music"}
        >
          {musicPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        {(state.phase === "betting" || state.phase === "round_over") && (
          <Button
            size="lg"
            className={`bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wider
              ${isMobile ? "w-44 h-12 text-sm" : "w-48"}`}
            onClick={state.phase === "round_over" ? nextRound : placeBetsAndDeal}
            data-testid="btn-deal"
          >
            {state.phase === "round_over" ? "NEXT ROUND" : "DEAL ROUND"}
          </Button>
        )}

        {state.phase === "dealer_turn" && !state.dealerCards[1]?.faceUp && (
          <Button
            size="lg"
            className={`bg-accent text-accent-foreground font-bold tracking-wider
              ${isMobile ? "w-52 h-12 text-sm" : "w-56"}`}
            onClick={dealerReveal}
            data-testid="btn-reveal"
          >
            REVEAL HOLE CARD
          </Button>
        )}

        {state.phase === "dealer_turn" && state.dealerCards[1]?.faceUp && (
          <div className="flex gap-3">
            <Button
              size="lg"
              variant={canHit ? "default" : "secondary"}
              disabled={!canHit}
              onClick={dealerHit}
              data-testid="btn-hit"
              className={isMobile ? "w-28 h-12 text-sm font-bold" : ""}
            >
              HIT
            </Button>
            <Button
              size="lg"
              variant={canStand ? "default" : "secondary"}
              disabled={!canStand}
              onClick={dealerStand}
              data-testid="btn-stand"
              className={isMobile ? "w-28 h-12 text-sm font-bold" : ""}
            >
              STAND
            </Button>
          </div>
        )}

        {/* Desktop payout controls inline */}
        {isPayoutPhase && !isMobile && (
          <div className="flex flex-col items-center gap-1">
            <div className="text-white/60 text-xs font-mono tracking-wider">
              PAY OUT WINNERS — USE CHIPS ABOVE EACH PLAYER
            </div>
            <Button
              size="lg"
              className="w-56 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={finishPayouts}
              data-testid="btn-finish-payouts"
            >
              DONE — NEXT ROUND
            </Button>
          </div>
        )}

        {/* Mobile: just a label — payout panel slides up */}
        {isPayoutPhase && isMobile && (
          <div className="text-amber-400/70 text-xs font-mono tracking-wider text-center">
            USE THE PANEL BELOW TO PAY OUT
          </div>
        )}
      </footer>

      {/* Mobile payout panel */}
      <AnimatePresence>
        {isPayoutPhase && isMobile && (
          <MobilePayoutPanel
            players={state.players}
            dealerCards={state.dealerCards}
            payoutsThisRound={payoutsThisRound}
            onPayout={payoutChips}
            onCollect={collectBet}
            onFinish={finishPayouts}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
