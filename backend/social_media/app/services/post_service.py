import math
from datetime import datetime, timezone


ENGAGEMENT_WEIGHT = 0.40
RECENCY_WEIGHT = 0.30
FOLLOW_WEIGHT = 0.30


def calculate_engagement(
    likes: int,
    comments: int,
    shares: int,
    saves: int,
) -> float:

    like_score = math.log1p(likes)
    comment_score = math.log1p(comments)
    share_score = math.log1p(shares)
    save_score = math.log1p(saves)

    return (
        like_score * 0.20
        + comment_score * 0.30
        + share_score * 0.30
        + save_score * 0.20
    )


def calculate_recency(
    created_at: datetime,
    half_life_hours: float = 24.0,
    freshness_window_hours: float = 6.0,
) -> float:

    now = datetime.now(timezone.utc)

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    age_hours = max(
        0,
        (now - created_at).total_seconds() / 3600
    )

    decay = math.exp(
        -math.log(2) * age_hours / half_life_hours
    )

    if age_hours <= freshness_window_hours:
        freshness_boost = (
            1
            + 0.25 *
            (1 - age_hours / freshness_window_hours)
        )
    else:
        freshness_boost = 1.0

    score = decay * freshness_boost

    return min(max(score, 0.0), 1.0)


def calculate_post_score(
    engagement: float,
    recency: float,
    is_followed: bool,
) -> float:

    engagement_score = 1 - math.exp(
        -max(engagement, 0.0)
    )

    recency_score = min(
        max(recency, 0.0),
        1.0
    )

    follow_score = 1.0 if is_followed else 0.0

    return (
        engagement_score * ENGAGEMENT_WEIGHT
        + recency_score * RECENCY_WEIGHT
        + follow_score * FOLLOW_WEIGHT
    )
