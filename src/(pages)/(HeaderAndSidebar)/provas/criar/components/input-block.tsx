type InputBlockProps = {
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
};

export const InputBlock = ({ label, children, required }: InputBlockProps) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm flex items-center gap-2">
      {label}
      {required ? (
        <span className="text-red-500"> *</span>
      ) : (
        <span className="text-xs"> (opcional)</span>
      )}
    </label>
    {children}
  </div>
);
