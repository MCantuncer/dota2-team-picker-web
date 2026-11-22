import { describe, expect, it } from "vitest";
import { INNATE_ICON, splitTalent, talentIcon } from "./talent-icon";

const abilities = {
  abilities: [
    { id: 1, key: "antimage_blink", name: "Blink", slot: 2, maxLevel: 4, ultimate: false },
    { id: 2, key: "antimage_mana_void", name: "Mana Void", slot: 6, maxLevel: 3, ultimate: true },
    { id: 3, key: "invoker_chaos_meteor", name: "Chaos Meteor", slot: 4, maxLevel: 1, ultimate: false },
    { id: 4, key: "fake_void", name: "Void", slot: 5, maxLevel: 1, ultimate: false },
  ],
  talents: [],
  innate: ["Persecutor"],
};

describe("talent icons", () => {
  it("splits the number at the front from the rest of the name", () => {
    expect(splitTalent("-50s Mana Void Cooldown")).toEqual({ value: "-50s", rest: "Mana Void Cooldown" });
    expect(splitTalent("+9%/18% Persecutor Min/Max Movement Slow")).toEqual({ value: "+9%/18%", rest: "Persecutor Min/Max Movement Slow" });
    expect(splitTalent("2x Quas/Wex/Exort Active Bonuses")).toEqual({ value: "2x", rest: "Quas/Wex/Exort Active Bonuses" });
    expect(splitTalent("Triple Strike Stifling Dagger")).toEqual({ value: "", rest: "Triple Strike Stifling Dagger" });
  });

  it("uses the skill a talent names, the longest name first, plurals too", () => {
    expect(talentIcon("-50s Mana Void Cooldown", abilities)).toMatchObject({ kind: "skill", label: "Mana Void", src: expect.stringContaining("antimage_mana_void.png") });
    expect(talentIcon("+2 Chaos Meteors", abilities)).toMatchObject({ kind: "skill", label: "Chaos Meteor" });
    // "Blink" inside another word isn't Blink.
    expect(talentIcon("+10 Blinking Lights", abilities).kind).toBe("talent");
  });

  it("uses the innate mark, then the stat's icon, then the talent mark", () => {
    expect(talentIcon("+9%/18% Persecutor Min/Max Movement Slow", abilities)).toEqual({ kind: "innate", src: INNATE_ICON, label: "Persecutor" });
    expect(talentIcon("+15 Strength", abilities)).toMatchObject({ kind: "stat", label: "Strength", src: expect.stringContaining("hero_strength.png") });
    expect(talentIcon("+30 Movement Speed")).toMatchObject({ kind: "stat", src: expect.stringContaining("icon_movement_speed.png") });
    // A stat with more words is about something else.
    expect(talentIcon("+5 Armor for Enchantress and her units").kind).toBe("talent");
    expect(talentIcon("Strength", abilities).kind).toBe("talent");
  });
});
