import { ORANGE_TW } from "@/constants/colours";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { type IGame, GameType } from "@/types";
import { cn } from "@/utils/tailwind";

interface ITournamentNations {
  game: IGame;
  selectedTeamId: number | undefined;
  onSelectTeam: (teamId: number) => void;
  disabled?: boolean;
}

const LIMIT = MAX_SIGNUPS_PER_GAME[GameType.TOURNAMENT_NATIONS];

export function TournamentNations({
  game,
  selectedTeamId,
  onSelectTeam,
  disabled = false,
}: ITournamentNations) {
  if (game.type !== GameType.TOURNAMENT_NATIONS || !game.teams) return null;

  return (
    <div className="container flex flex-col items-center gap-y-2 p-4 w-full">
      <div className="container-header !h-auto !text-lg p-1 w-full pl-4 !justify-start mb-2">
        Select a team
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        {game.teams.map((team, index) => {
          const waitlistCount = Math.max(0, team.players.length - LIMIT);
          const isWaitlist = team.players.length >= LIMIT;
          const isSelected = selectedTeamId === index;

          return (
            <button
              key={index}
              disabled={disabled}
              onClick={() => {
                onSelectTeam(index);
              }}
              className={cn(
                "flex flex-col items-center justify-center p-2 border-2 text-sm transition-colors min-h-[64px]",
                {
                  "bg-[var(--background-window-highlight)] border-[var(--border-dark)]":
                    isSelected,
                  "bg-[var(--container-background-color)] border-[var(--border-light)]":
                    !isSelected,
                },
              )}
            >
              <span className="font-bold">{team.name}</span>
              <div className="flex flex-col items-center gap-y-0.5">
                <span className="text-xs">
                  Players: {Math.min(team.players.length, LIMIT)} / {LIMIT}
                </span>
                {isWaitlist && (
                  <div
                    className={cn(
                      "text-[10px] px-2 py-0.5 font-bold text-black uppercase",
                      ORANGE_TW,
                    )}
                  >
                    Waitlist only (+{waitlistCount})
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
