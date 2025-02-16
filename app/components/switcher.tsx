"use client"

import { PiChalkboardTeacherLight, PiStudent } from "react-icons/pi"
import { useSwitch } from "../context/switcher-context"

type SwitcherButtonProps = {
    isActive: boolean
    children: React.ReactNode,
    toggleSwitch: () => void
}

const SwitcherButton = ({ isActive, toggleSwitch, children }: SwitcherButtonProps) => {
    return (
        <button
            onClick={toggleSwitch}
            className={`flex gap-2 items-center px-6 py-1 ${isActive ? 'text-primary bg-straw-600' : 'text-neutral-600 bg-neutral-200 hover:bg-straw-800 transition-all'}`}
        >
            {children}
        </button>
    )
}

export default function Switcher () {
    const { switchState, setSwitchState } = useSwitch();

    return (
        <div className="flex mb-8">
            <SwitcherButton isActive={!switchState} toggleSwitch={() => setSwitchState(false)}>
                <PiStudent className="text-xl" />
                Aluno
            </SwitcherButton>
            <SwitcherButton isActive={switchState} toggleSwitch={() => setSwitchState(true)}>
                <PiChalkboardTeacherLight className="text-2xl" />
                Professor
            </SwitcherButton>
        </div>
    );
};