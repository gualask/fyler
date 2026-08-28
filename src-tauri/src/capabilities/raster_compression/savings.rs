const MINIMUM_SAVING_PERCENT: u128 = 5;

/// Returns true unless the candidate is at least exactly five percent smaller.
pub(crate) fn should_keep_original(original_size: usize, candidate_size: usize) -> bool {
    let original = original_size as u128;
    let candidate = candidate_size as u128;
    candidate * 100 > original * (100 - MINIMUM_SAVING_PERCENT)
}

#[cfg(test)]
mod tests {
    use super::should_keep_original;

    #[test]
    fn accepts_the_exact_five_percent_boundary() {
        assert!(!should_keep_original(1_000, 950));
        assert!(should_keep_original(1_000, 951));
    }

    #[test]
    fn integer_comparison_does_not_round_the_threshold() {
        assert!(!should_keep_original(101, 95));
        assert!(should_keep_original(101, 96));
    }
}
