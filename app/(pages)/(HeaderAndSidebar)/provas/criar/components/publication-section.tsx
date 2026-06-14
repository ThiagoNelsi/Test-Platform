"use client";

import { DatePicker } from "@/app/components/ui/date-picker";
import { useCreateTest } from "@/app/context/create-test-context";
import { InputBlock } from "./input-block";

export const PublicationSection = () => {
  const {
    enablePublishDate,
    setEnablePublishDate,
    publishDate,
    setPublishDate,
  } = useCreateTest();

  return (
    <div>
      <h1 className="font-semibold mb-2">Publicação</h1>
      <div className="flex flex-col gap-6 bg-gray-100 p-6 rounded-lg">
        <div className="flex gap-10">
          <InputBlock
            label={
              <>
                <input
                  type="checkbox"
                  checked={enablePublishDate}
                  onChange={() => setEnablePublishDate(!enablePublishDate)}
                  id="publishDate"
                />
                <label htmlFor="publishDate">Agendar publicação</label>
              </>
            }
          >
            <DatePicker
              fromDate={new Date()}
              date={publishDate}
              defaultTime="08:00"
              setDate={setPublishDate}
              disabled={!enablePublishDate}
            />
          </InputBlock>
        </div>
      </div>
    </div>
  );
};
