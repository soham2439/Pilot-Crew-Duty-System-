using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend_dotnet.Migrations
{
    /// <inheritdoc />
    public partial class AddPilotAssignmentToDutyLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PilotId",
                table: "DutyLogs",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DutyLogs_PilotId",
                table: "DutyLogs",
                column: "PilotId");

            migrationBuilder.AddForeignKey(
                name: "FK_DutyLogs_Users_PilotId",
                table: "DutyLogs",
                column: "PilotId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DutyLogs_Users_PilotId",
                table: "DutyLogs");

            migrationBuilder.DropIndex(
                name: "IX_DutyLogs_PilotId",
                table: "DutyLogs");

            migrationBuilder.DropColumn(
                name: "PilotId",
                table: "DutyLogs");
        }
    }
}
