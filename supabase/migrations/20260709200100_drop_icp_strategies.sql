-- Retire legacy per-ICP strategy table (migrated to strategies + strategy_targets in Stage 2).

DROP TABLE IF EXISTS public.icp_strategies CASCADE;
