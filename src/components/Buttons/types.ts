export interface IButton extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action: () => void;
  loading: boolean;
}
