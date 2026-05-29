using Microsoft.EntityFrameworkCore;
using backend_dotnet.Models;

namespace backend_dotnet.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<DutyLog> DutyLogs { get; set; }

        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<DutyLog>()
                .HasOne(d => d.Pilot)
                .WithMany(u => u.DutyLogs)
                .HasForeignKey(d => d.PilotId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
