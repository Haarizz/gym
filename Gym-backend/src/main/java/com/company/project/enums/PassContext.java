package com.company.project.enums;

/** Where a Reward Pass is being spent — decides which reward types qualify. */
public enum PassContext {
    MEMBERSHIP,
    PT,
    CLASS;

    public boolean accepts(RewardType type) {
        return switch (this) {
            case MEMBERSHIP -> type == RewardType.MEMBERSHIP_DISCOUNT;
            // The rule form folds FREE_CLASS into one "Free PT / Class" option stored as
            // FREE_PT, so either type covers either kind of session.
            case PT, CLASS -> type == RewardType.FREE_PT || type == RewardType.FREE_CLASS;
        };
    }

    /** Maps a TrainingSession.type ("pt" / "class") to a context; anything else (e.g. "facility") has none. */
    public static PassContext forSessionType(String sessionType) {
        if ("pt".equalsIgnoreCase(sessionType)) return PT;
        if ("class".equalsIgnoreCase(sessionType)) return CLASS;
        return null;
    }
}
