interface ISignupForm {
  firstNameStore: [string, (value: string) => void];
  lastNameStore: [string, (value: string) => void];
  phoneStore: [number | undefined, (value: number) => void];
}

export function SignupForm({
  firstNameStore: [firstNameValue, setFirstNameValue],
  lastNameStore: [lastNameValue, setLastNameValue],
  phoneStore: [phoneValue, setPhoneValue],
}: ISignupForm) {
  return (
    <div className="container flex flex-col items-center gap-y-2 p-4 w-full">
      <div className="container-header w-[calc(100%+12px)] -mt-2" />
      <h5 className="self-start">Sign up to play</h5>
      <div className="flex flex-col items-center gap-y-2 p-2 w-full [&>input]:h-12">
        <input
          type="text"
          value={firstNameValue}
          onChange={(e) => {
            setFirstNameValue(e.target.value);
          }}
          placeholder="First name"
        />
        <input
          type="text"
          value={lastNameValue}
          onChange={(e) => {
            setLastNameValue(e.target.value);
          }}
          placeholder="Last name"
        />
        <input
          type="number"
          value={phoneValue}
          onChange={(e) => {
            const targetAsNumber = Number(e.target.value);
            if (isNaN(targetAsNumber)) return;

            setPhoneValue(targetAsNumber);
          }}
          placeholder="00351961666666"
        />
      </div>
    </div>
  );
}
