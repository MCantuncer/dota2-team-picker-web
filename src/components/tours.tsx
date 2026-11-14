import type { ReactNode } from "react";
import { Kbd } from "./kbd";

/**
 * Every page's tour, one step per control. A step lights the first visible element marked
 * `data-tour="<target>"`; a step whose control is not on screen (no picks yet, Watch Dota on a phone) is skipped.
 * Tips are one line from the player's side. `verb` is "Click", or "Tap" on a touch screen.
 */
export type TourStep = {
  target: string;
  title: string;
  tip: (verb: "Click" | "Tap") => ReactNode;
  /** Clicking the lit control does the thing and moves on, as Next would. Off for text boxes, which need typing. */
  movesOn?: boolean;
};

export type TourId = "draft" | "my-heroes" | "your-games" | "one-game" | "stacks" | "stack" | "friends" | "profile" | "report";

export const TOURS: Record<TourId, TourStep[]> = {
  draft: [
    {
      target: "draft-role",
      title: "Your Role",
      tip: (verb) => `${verb} the role you play. Every pick is scored for it.`,
      movesOn: true,
    },
    {
      target: "draft-plan",
      title: "Who to Plan For",
      tip: () => (
        <>
          <b>Just Me</b> suggests your pick. <b>Team</b> plans a pick for all five of you.
        </>
      ),
      movesOn: true,
    },
    {
      target: "draft-seats",
      title: "Team Seats",
      tip: (verb) => (
        <>
          Seat your teammates, then {verb.toLowerCase()} <b>Invite to Party</b>. Each seat says who is In Party, Invited or Not on
          Site.
        </>
      ),
    },
    {
      target: "draft-enemy",
      title: "Add Enemy Heroes",
      tip: () => (
        <>
          Type 2 or 3 letters, then <Kbd>Enter</Kbd>. Add a digit for the role: <Kbd>sf2</Kbd> is Shadow Fiend mid.
        </>
      ),
    },
    {
      target: "draft-bans",
      title: "Add Bans",
      tip: () => (
        <>
          Several in one go: <Kbd>pa sf am</Kbd> then <Kbd>Enter</Kbd>.
        </>
      ),
    },
    {
      target: "draft-watch",
      title: "Skip the Typing",
      tip: (verb) => (
        <>
          {verb} <b>Watch Dota</b> and the site reads every pick and ban from your Dota screen.
        </>
      ),
      movesOn: true,
    },
    {
      target: "draft-picks",
      title: "Your Picks",
      tip: (verb) =>
        verb === "Tap" ? (
          "Best first, scored for this draft. Tap one to see why."
        ) : (
          <>
            Best first, scored for this draft. Press <Kbd>1</Kbd> to <Kbd>8</Kbd> to open one.
          </>
        ),
      movesOn: true,
    },
    {
      target: "draft-why",
      title: "Why This Hero",
      tip: (verb) => `${verb} any line to see the numbers behind it.`,
    },
    {
      target: "draft-picked",
      title: "Lock Your Pick",
      tip: (verb) => (
        <>
          {verb} <b>Picked</b> once you take it. Items, skills and a game plan open when all 10 heroes are in.
        </>
      ),
      movesOn: true,
    },
    {
      target: "your-game-seats",
      title: "Your Game",
      tip: (verb) => `${verb} a teammate's seat to see their plan.`,
    },
    {
      target: "your-game-items",
      title: "Item Build",
      tip: () => (
        <>
          Your buy order for this game. <Kbd>I</Kbd> opens it.
        </>
      ),
    },
    {
      target: "your-game-story",
      title: "Game Story",
      tip: () => (
        <>
          Your lane, the fight window and the enemy to watch. <Kbd>G</Kbd> opens it.
        </>
      ),
    },
    {
      target: "your-game-skills",
      title: "Skills and Talents",
      tip: () => (
        <>
          Skill order and talents for this draft. <Kbd>S</Kbd> opens it.
        </>
      ),
    },
  ],
  "my-heroes": [
    {
      target: "my-heroes-roles",
      title: "Your Roles",
      tip: (verb) => `${verb} a role to edit its heroes.`,
      movesOn: true,
    },
    {
      target: "my-heroes-use",
      title: "Use in Drafts",
      tip: () => "Tick it to use this role's heroes in your picks.",
    },
    {
      target: "my-heroes-fill",
      title: "Fill from My Games",
      tip: (verb) => `${verb} it to add the heroes you play most in this role.`,
    },
    {
      target: "my-heroes-list",
      title: "Your Top 5",
      tip: (verb) => (
        <>
          {verb} a hero, then <b>Add to Top 5</b>. Those get a boost in your picks.
        </>
      ),
    },
    {
      target: "my-heroes-search",
      title: "Add a Hero",
      tip: (verb) => (
        <>
          Type a name and press <Kbd>Enter</Kbd>, or {verb.toLowerCase()} any portrait below.
        </>
      ),
    },
    {
      target: "my-heroes-games",
      title: "Your Games",
      tip: (verb) => `${verb} it to see what wins and loses you games.`,
    },
  ],
  "your-games": [
    {
      target: "your-games-numbers",
      title: "Your Numbers",
      tip: () => "Games, wins and your most played hero, from your recent games.",
    },
    {
      target: "your-games-findings",
      title: "Strengths and Problems",
      tip: (verb) => (
        <>
          {verb} <b>Show Details</b> for the games behind each one.
        </>
      ),
    },
    {
      target: "your-games-filter",
      title: "Filter",
      tip: () => "Narrow the list by hero, role or result.",
    },
    {
      target: "your-games-row",
      title: "One Game",
      tip: (verb) => `${verb} a game for its full review.`,
    },
  ],
  "one-game": [
    {
      target: "one-game-numbers",
      title: "Numbers",
      tip: () => "Each one next to other players on the same hero.",
    },
    {
      target: "one-game-findings",
      title: "Went Well and To Fix",
      tip: () => "What happened, what it cost and what to do next time.",
    },
    {
      target: "one-game-lane",
      title: "Lane at 10 Minutes",
      tip: () => "How far ahead or behind your lane was at 10 minutes.",
    },
    {
      target: "one-game-deaths",
      title: "Deaths",
      tip: () => "Every death on the game clock, with the ones before 10 minutes counted.",
    },
    {
      target: "one-game-opendota",
      title: "Full Match",
      tip: (verb) => `${verb} it to open the whole match on OpenDota.`,
    },
  ],
  stacks: [
    {
      target: "stacks-tabs",
      title: "Your Stacks",
      tip: (verb) => (
        <>
          {verb} a Stack to open it, or <b>New Stack</b> to make one.
        </>
      ),
    },
    {
      target: "stack-draft",
      title: "Draft for Your Stack",
      tip: (verb) => `${verb} it to draft with this Stack's players and heroes.`,
    },
    {
      target: "stacks-page",
      title: "Stack Page",
      tip: () => "Requests to join, and whether anyone can find this Stack.",
    },
    {
      target: "stack-lineup",
      title: "Lineup",
      tip: () => "Each player's top hero for the position they play most.",
    },
    {
      target: "stack-coverage",
      title: "Position Coverage",
      tip: () => "Who plays each position. A position no one covers shows in amber.",
    },
    {
      target: "stacks-invite",
      title: "Invite Players",
      tip: () => "Invite a friend in one click. Players not on the site yet need your friend link first.",
    },
    {
      target: "stacks-find",
      title: "Find a Stack",
      tip: () => "Ask to join a Stack and the owner answers on the site.",
    },
  ],
  stack: [
    {
      target: "stack-draft",
      title: "Draft for This Stack",
      tip: (verb) => `${verb} it to draft with this Stack's players and heroes.`,
    },
    {
      target: "stack-manage",
      title: "Manage Stack",
      tip: () => "Invite players and set who plays which position.",
    },
    {
      target: "stack-ask",
      title: "Ask to Join",
      tip: () => "The owner answers on the site.",
    },
    {
      target: "stack-open",
      title: "Open to Requests",
      tip: () => "Tick it so anyone can find this Stack and ask to join.",
    },
    {
      target: "stack-lineup",
      title: "Lineup",
      tip: () => "Each player's top hero for the position they play most.",
    },
    {
      target: "stack-coverage",
      title: "Position Coverage",
      tip: () => "Who plays each position. A position no one covers shows in amber.",
    },
    {
      target: "stack-requests",
      title: "Players Who Want to Join",
      tip: (verb) => (
        <>
          {verb} <b>Accept</b> to add them as a Player.
        </>
      ),
    },
  ],
  friends: [
    {
      target: "friends-link",
      title: "Your Friend Link",
      tip: (verb) => (
        <>
          {verb} <b>Copy Link</b> and send it to the people you queue with.
        </>
      ),
    },
    {
      target: "friends-list",
      title: "Your Friends",
      tip: (verb) => `${verb} a friend to see their heroes and your games together.`,
    },
    {
      target: "friends-invite",
      title: "Invite to Party",
      tip: () => "It pops up on their screen while they are on the site.",
    },
    {
      target: "friends-draft",
      title: "Plan a Draft",
      tip: (verb) => `${verb} it to open the draft with them on your team.`,
    },
  ],
  profile: [
    {
      target: "profile-rank",
      title: "Your Rank",
      tip: (verb) => `Read from OpenDota. ${verb} the refresh button after a game.`,
    },
    {
      target: "profile-positions",
      title: "Positions Played",
      tip: () => "The roles you played in your recent games, with your wins in each.",
    },
    {
      target: "profile-heroes",
      title: "Your Heroes",
      tip: () => "Your wins on every hero you played, for the period you pick.",
    },
    {
      target: "profile-privacy",
      title: "Privacy",
      tip: () => "Choose whether friends can plan drafts with your heroes.",
    },
    {
      target: "profile-edit",
      title: "Edit My Heroes",
      tip: () => "The heroes your picks lean toward, for each position.",
    },
  ],
  report: [
    {
      target: "report-team",
      title: "Your Team",
      tip: () => "Each hero's numbers, and the key items with the minute they came.",
    },
    {
      target: "report-lanes",
      title: "Lanes at 10 Minutes",
      tip: () => "How far ahead or behind each lane was in net worth.",
    },
    {
      target: "report-turning",
      title: "Turning Points",
      tip: () => "The swings and fights that decided the game.",
    },
    {
      target: "report-hurt",
      title: "What Hurt You",
      tip: () => "Where your damage taken came from, and the enemy who did best.",
    },
    {
      target: "report-feedback",
      title: "Your Feedback",
      tip: (verb) => `${verb} it for your own review of this game.`,
    },
  ],
};
