import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { type IGame, GameType } from "@/types";
import { cn } from "@/utils/tailwind";

interface ITournamentNations {
  game: IGame;
  selectedTeamId: number | undefined;
  onSelectTeam: (teamId: number) => void;
  disabled?: boolean;
}

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
          const isFull =
            team.players.length >=
            MAX_SIGNUPS_PER_GAME[GameType.TOURNAMENT_NATIONS];
          const isSelected = selectedTeamId === index;

          return (
            <button
              key={index}
              disabled={disabled || isFull}
              onClick={() => {
                onSelectTeam(index);
              }}
              className={cn(
                "flex flex-col items-center justify-center p-2 border-2 text-sm transition-colors",
                {
                  "bg-[var(--background-window-highlight)] border-[var(--border-dark)]":
                    isSelected,
                  "bg-[var(--container-background-color)] border-[var(--border-light)]":
                    !isSelected,
                  "opacity-50 cursor-not-allowed bg-gray-300":
                    isFull && !isSelected,
                },
              )}
            >
              <span className="font-bold">{team.name}</span>
              <span className="text-xs">
                {team.name ?? ""} {team.players.length} /{" "}
                {MAX_SIGNUPS_PER_GAME[GameType.TOURNAMENT_NATIONS]}
              </span>
              {isFull && (
                <span className="text-[10px] text-red-500 uppercase">Full</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
