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
            className={`flex gap-2 rounded-sm items-center border px-6 py-1 ${isActive ? 'text-primary border-ash_gray-400 bg-ash_gray-800' : 'text-neutral-600 border-neutral-200 hover:border-ash_gray-700 transition-all'}`}
        >
            {children}
        </button>
    )
}

export default function Switcher () {
    const { switchState, setSwitchState } = useSwitch();

    return (
        <div className="flex mb-8 text-sm">
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