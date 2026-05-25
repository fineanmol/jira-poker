/**
 * TshirtCustomizer — inline panel for editing T-shirt → story-point mappings.
 *
 * Uses native <details>/<summary> for expand/collapse so it works correctly
 * inside Forge iframes without any JS state for the toggle.
 */
import { useState, useEffect } from 'react';
import type { TshirtMapping } from '../types';
import { TSHIRT_SIZES } from '../types';

interface TshirtCustomizerProps {
  mapping: TshirtMapping;
  saving:  boolean;
  onSave:  (mapping: TshirtMapping) => Promise<void>;
}

export function TshirtCustomizer({ mapping, saving, onSave }: TshirtCustomizerProps) {
  const [draft, setDraft] = useState<TshirtMapping>({ ...mapping });

  // Sync draft when the saved mapping loads from the backend (bootstrap is async)
  useEffect(() => { setDraft({ ...mapping }); }, [mapping]);

  const handleChange = (size: keyof TshirtMapping, raw: string) => {
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0 && num <= 999) {
      setDraft((prev) => ({ ...prev, [size]: num }));
    }
  };

  const handleSave = async () => {
    await onSave({ ...draft });
  };

  return (
    <details className="tshirt-customizer">
      <summary className="tshirt-customizer__toggle" aria-label="Customize T-shirt to story point mapping">
        ⚙ Customize point values
      </summary>

      <div className="tshirt-customizer__body">
        <p className="tshirt-customizer__desc">
          Map each T-shirt size to a story-point value. Changes are saved to your account.
        </p>

        <div className="tshirt-customizer__grid" role="group" aria-label="T-shirt to story points mapping">
          {TSHIRT_SIZES.map((size) => (
            <div key={size} className="tshirt-customizer__row">
              <span className="tshirt-customizer__size">{size}</span>
              <span className="tshirt-customizer__arrow" aria-hidden="true">→</span>
              <input
                type="number"
                className="tshirt-customizer__input"
                value={draft[size]}
                min={1}
                max={999}
                aria-label={`${size} story points`}
                onChange={(e) => handleChange(size, e.target.value)}
              />
              <span className="tshirt-customizer__unit" aria-label="story points">SP</span>
            </div>
          ))}
        </div>

        <button
          className="btn btn--primary btn--full"
          onClick={handleSave}
          disabled={saving}
          aria-label="Save mapping"
        >
          {saving ? '…' : '💾 Save Mapping'}
        </button>
      </div>
    </details>
  );
}
