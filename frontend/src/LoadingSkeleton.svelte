<script>
  // LoadingSkeleton component
</script>

<div class="skeleton-container">
  <div class="skeleton title"></div>
  <div class="skeleton line"></div>
  <div class="skeleton line"></div>
  <div class="skeleton line short"></div>
</div>

<style>
  .skeleton-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(16, 23, 34, 0.4);
    border: 1px dashed var(--line);
    border-radius: 8px;
    margin-top: 16px;
  }

  .skeleton {
    height: 16px;
    background: linear-gradient(90deg, var(--panel-2) 25%, var(--line) 50%, var(--panel-2) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }

  .skeleton.title {
    height: 24px;
    width: 60%;
    margin-bottom: 8px;
  }

  .skeleton.line.short {
    width: 40%;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
