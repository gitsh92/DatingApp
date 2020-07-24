using Microsoft.EntityFrameworkCore;
using NetworkApp.API.Models;

namespace NetworkApp.API.Data
{
  public class DataContext : DbContext
  {
    public DataContext(DbContextOptions<DataContext> options) : base(options) { }

    public DbSet<Value> Values { get; set; }
  }
}